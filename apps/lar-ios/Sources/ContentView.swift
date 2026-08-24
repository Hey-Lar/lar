import SwiftUI
import WebKit
import AVFoundation
import Speech
import CoreLocation

/// Lar — the glass UI in a WKWebView, its "Hey Lar" pill wired to a local
/// Qwen3 model served by Ollama on the host Mac. Replies stream token-by-token
/// into the page's own glass sheet; the model can also drive the UI by
/// prefixing an [OPEN:tab] command; the conversation remembers itself.
struct ContentView: View {
    @StateObject private var lar = LarBridge()
    @State private var prompt = ""
    @FocusState private var focused: Bool

    var body: some View {
        ZStack(alignment: .bottom) {
            LarWebView(bridge: lar)
                .ignoresSafeArea()
            if lar.listening {
                HStack(spacing: 10) {
                    Button { lar.startListening() } label: {
                        Image(systemName: lar.micActive ? "waveform.circle.fill" : "mic.circle")
                            .font(.title2)
                            .foregroundStyle(lar.micActive ? .green : .primary)
                            .symbolEffect(.pulse, isActive: lar.micActive)
                    }
                    TextField(lar.micActive ? "Listening…" : "Ask Lar…", text: $prompt)
                        .font(.system(.body, design: .monospaced))
                        .focused($focused)
                        .onSubmit(send)
                        .submitLabel(.send)
                        .onChange(of: lar.transcript) { _, t in if !t.isEmpty { prompt = t } }
                    Button { lar.voiceOn.toggle() } label: {
                        Image(systemName: lar.voiceOn ? "speaker.wave.2.fill" : "speaker.slash")
                            .font(.body)
                    }
                    Button(action: send) {
                        Image(systemName: lar.busy ? "hourglass" : "arrow.up.circle.fill")
                            .font(.title2)
                    }
                    .disabled(lar.busy || prompt.isEmpty)
                }
                .padding(14)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22))
                .padding(.horizontal, 16)
                .padding(.bottom, 90)
                .onAppear { focused = true }
            }
        }
        .overlay { EdgeGlow(active: lar.micActive || lar.speaking, speaking: lar.speaking) }
        .onAppear { lar.startWakeWatch() }
        .overlay(alignment: .bottomTrailing) {
            Menu {
                Section("Engines · local") {
                    Label("Qwen3 4B \(lar.llmUp ? "· up" : "· down")",
                          systemImage: lar.llmUp ? "brain.head.profile" : "exclamationmark.triangle")
                    Label("Kokoro voice \(lar.ttsUp ? "· up" : "· down")",
                          systemImage: lar.ttsUp ? "waveform" : "speaker.slash")
                }
                Section {
                    Button { lar.voiceOn.toggle() } label: {
                        Label(lar.voiceOn ? "Mute Lar's voice" : "Unmute Lar's voice",
                              systemImage: lar.voiceOn ? "speaker.slash" : "speaker.wave.2")
                    }
                    Button { lar.wakeEnabled.toggle() } label: {
                        Label(lar.wakeUnavailable ? "Wake word: needs a real iPhone"
                              : lar.wakeEnabled ? "Wake word: on  (\u{201C}Hey Lar\u{201D})" : "Wake word: off",
                              systemImage: lar.wakeUnavailable ? "iphone.slash"
                              : lar.wakeEnabled ? "ear" : "ear.trianglebadge.exclamationmark")
                    }
                    Button { lar.editLayout() } label: {
                        Label("Edit layout", systemImage: "square.and.pencil")
                    }
                    Button { lar.newConversation() } label: {
                        Label("New conversation", systemImage: "arrow.counterclockwise")
                    }
                }
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 15))
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(width: 40, height: 40)
                    .background(.black.opacity(0.55), in: Circle())
            }
            .padding(.trailing, 14)
            .padding(.bottom, 30)
            .onAppear { lar.checkEngines() }
            .onTapGesture { lar.checkEngines() }
        }
    }

    private func send() {
        let q = prompt.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        prompt = ""
        if lar.micActive { lar.stopListening(send: false) }
        lar.ask(q)
    }
}

final class LarBridge: NSObject, ObservableObject, WKScriptMessageHandler, AVAudioPlayerDelegate, AVSpeechSynthesizerDelegate, CLLocationManagerDelegate {
    @Published var listening = false
    @Published var busy = false
    @Published var voiceOn = true
    @Published var llmUp = false
    @Published var micActive = false
    @Published var transcript = ""
    @Published var speaking = false {
        didSet { pushLive() }
    }
    @Published var wakeEnabled = UserDefaults.standard.object(forKey: "wakeEnabled") as? Bool ?? true {
        didSet {
            UserDefaults.standard.set(wakeEnabled, forKey: "wakeEnabled")
            wakeEnabled ? startWakeWatch() : (earMode == .wake ? stopListening(send: false) : ())
        }
    }
    private enum EarMode { case off, wake, capture }
    private var earMode: EarMode = .off
    private var lastSpokeAt = Date.distantPast
    // sentence-streaming voice: speak while the model is still writing
    private var sentenceQueue: [String] = []
    private var neuralBusy = false
    private var neuralFailed = false
    private var spokenChars = 0
    @Published var wakeUnavailable = false
    private var wakeFailures = 0

    /// mirror live state into the page: the card glows with the phone
    private func pushLive() {
        let on = micActive || speaking
        js("document.querySelector('.card') && document.querySelector('.card').classList.toggle('lar-live', \(on))")
    }
    @Published var ttsUp = false
    private let voice = AVSpeechSynthesizer()

    override init() {
        super.init()
        voice.delegate = self
        loc.delegate = self
        loc.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    // MARK: native location — the shell feeds coordinates into the page so
    // WKWebView never shows its per-origin geolocation prompt (the bundle
    // path is the origin, and it changes on every reinstall).
    private let loc = CLLocationManager()
    private var lastFix: CLLocationCoordinate2D?
    func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        switch m.authorizationStatus {
        case .notDetermined: m.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways: m.requestLocation()
        default: break
        }
    }
    func locationManager(_ m: CLLocationManager, didUpdateLocations fixes: [CLLocation]) {
        guard let c = fixes.last?.coordinate else { return }
        lastFix = c
        pushFix()
    }
    func locationManager(_ m: CLLocationManager, didFailWithError e: Error) {}
    private func pushFix(_ attempt: Int = 0) {
        guard let c = lastFix else { return }
        if webView != nil {
            js("window.larLoc && window.larLoc(\(c.latitude), \(c.longitude))")
        }
        // the page may still be loading when the first fix lands — repush a
        // few times; gotFix is idempotent so extra pushes just repaint
        if attempt < 5 { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { self.pushFix(attempt + 1) } }
    }

    func audioPlayerDidFinishPlaying(_ p: AVAudioPlayer, successfully: Bool) {
        neuralBusy = false
        if !sentenceQueue.isEmpty {
            pumpSpeech()                     // keep the voice rolling, glow stays on
            return
        }
        speaking = false; lastSpokeAt = Date()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.startWakeWatch() }
    }
    func speechSynthesizer(_ s: AVSpeechSynthesizer, didStart u: AVSpeechUtterance) { speaking = true }
    func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) {
        speaking = false; lastSpokeAt = Date()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.startWakeWatch() }
    }
    func speechSynthesizer(_ s: AVSpeechSynthesizer, didCancel u: AVSpeechUtterance) { speaking = false }
    private var player: AVAudioPlayer?
    weak var webView: WKWebView?

    /// rolling conversation, oldest first; capped so a 4B stays sharp
    private var history: [[String: String]] = []

    /// Personal grounding facts live in Web/facts.local.txt (gitignored).
    /// Without it, Lar runs on the demo household below — the open-source
    /// build never ships anyone's real finances.
    private static let demoFacts = """
    Facts: net worth EUR 100,000 (liquid 40,000 + pension 15,000 + unvested equity 45,000). \
    Savings gap EUR 5,000, due 01 oct. Keys to the new home 15 dec. Tax consult 07 sep. \
    Car listed early nov. Rent hunt: EUR 1,200-2,000. Monthly outgoings 3,500, income 4,500, surplus 1,000.
    """

    private let system: String = {
        let facts = (Bundle.main.url(forResource: "facts.local", withExtension: "txt", subdirectory: "Web")
            .flatMap { try? String(contentsOf: $0, encoding: .utf8) }) ?? LarBridge.demoFacts
        return """
        You are Lar, the calm guardian of the home. Answer in 2-3 short sentences, plain text, no markdown.
        \(facts)
        You can act on the home by STARTING your reply with one or more tags, then a short sentence. Tags: \
        [OPEN:hm|mu|we|he|mv] opens a board (home, music, wealth, health, the move). \
        [SCENE:movie|wind|focus|morning] runs a scene. \
        [ON:lights|heat|lock|dnd] and [OFF:lights|heat|lock|dnd] set a control. \
        Only use tags when the user asks you to do or show something. \
        Example - user says goodnight: "[SCENE:wind][ON:dnd][ON:lock] Warm light on, notifications held until 7:00, door locked. Sleep well."
        """
    }()

    // ── hands-free: tap Hey Lar, speak, silence sends ──
    private let audioEngine = AVAudioEngine()
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-IE"))
        ?? SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recTask: SFSpeechRecognitionTask?
    private var silenceTimer: Timer?

    /// continuous, quiet loop that only listens for its own name
    func startWakeWatch() {
        guard wakeEnabled, !wakeUnavailable, earMode == .off, !speaking else { return }
        SFSpeechRecognizer.requestAuthorization { st in
            guard st == .authorized else { return }
            AVAudioApplication.requestRecordPermission { ok in
                guard ok else { return }
                DispatchQueue.main.async {
                    guard self.earMode == .off, !self.speaking else { return }
                    self.earMode = .wake
                    self.beginCapture()
                }
            }
        }
    }

    /// "hey lar", "hi lar", or just "lar" — then the rest is the question
    private func handleWakePartial(_ text: String) {
        guard Date().timeIntervalSince(lastSpokeAt) > 1.0 else { return }
        let lower = text.lowercased()
        guard let m = lower.range(of: #"(?:\bhey\b|\bhi\b)?[,.!\s]*\blar\b[,.!\s]*"#,
                                  options: .regularExpression) else { return }
        let rest = String(text[m.upperBound...]).trimmingCharacters(in: .whitespaces)
        earMode = .capture
        listening = true
        transcript = rest
        micActive = true
        pushLive()
        bumpSilence(seconds: rest.isEmpty ? 4 : 1.8)
    }

    func startListening() {
        guard !micActive || earMode == .wake else { stopListening(send: !transcript.isEmpty); return }
        if earMode == .wake { stopListening(send: false) }   // hand the mic from wake to capture
        player?.stop()
        if voice.isSpeaking { voice.stopSpeaking(at: .immediate) }
        SFSpeechRecognizer.requestAuthorization { st in
            guard st == .authorized else {
                DispatchQueue.main.async {
                    self.reply("HEY LAR", "I can't hear yet",
                               "Speech recognition permission was not granted. You can still type.")
                }
                return
            }
            AVAudioApplication.requestRecordPermission { ok in
                DispatchQueue.main.async {
                    guard ok else { return }
                    self.earMode = .capture
                    self.beginCapture()
                }
            }
        }
    }

    private func beginCapture() {
        NSLog("LAR beginCapture mode=%d", earMode == .wake ? 1 : 2)
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default,
                                    options: [.defaultToSpeaker, .duckOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let req = SFSpeechAudioBufferRecognitionRequest()
            req.shouldReportPartialResults = true
            if recognizer?.supportsOnDeviceRecognition == true {
                req.requiresOnDeviceRecognition = true   // local-first when the OS can
            }
            recRequest = req

            let node = audioEngine.inputNode
            let fmt = node.outputFormat(forBus: 0)
            node.removeTap(onBus: 0)
            node.installTap(onBus: 0, bufferSize: 1024, format: fmt) { [weak self] buf, _ in
                self?.recRequest?.append(buf)
            }
            audioEngine.prepare()
            try audioEngine.start()

            recTask = recognizer?.recognitionTask(with: req) { [weak self] res, err in
                guard let self else { return }
                if let r = res {
                    DispatchQueue.main.async {
                        switch self.earMode {
                        case .wake:
                            self.wakeFailures = 0
                            self.handleWakePartial(r.bestTranscription.formattedString)
                        case .capture:
                            self.transcript = r.bestTranscription.formattedString
                            self.bumpSilence()
                            if r.isFinal { self.stopListening(send: true) }
                        case .off: break
                        }
                    }
                }
                if err != nil {
                    DispatchQueue.main.async {
                        let wasWake = self.earMode == .wake
                        let hadText = !self.transcript.isEmpty
                        self.stopListening(send: self.earMode == .capture && hadText)
                        if wasWake {
                            self.wakeFailures += 1
                            if self.wakeFailures >= 3 {
                                // the Simulator has no dictation service; a real iPhone does
                                self.wakeUnavailable = true
                                NSLog("LAR wake watch unavailable (speech service errors)")
                            } else {
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self.startWakeWatch() }
                            }
                        } else if !hadText {
                            self.reply("HEY LAR", "I couldn't hear that",
                                "Dictation isn't available in the Simulator. On a real iPhone you would just speak - here, typing works.")
                        }
                    }
                }
            }
            NSLog("LAR engine started, mode=%d", earMode == .wake ? 1 : 2)
            if earMode == .capture {
                micActive = true
                pushLive()
                bumpSilence(seconds: 5)   // generous window before you start talking
            }
            transcript = ""
        } catch {
            NSLog("LAR capture error: %@", error.localizedDescription)
            reply("HEY LAR", "Microphone trouble", error.localizedDescription)
        }
    }

    /// quiet for a moment after speech = the question is finished
    private func bumpSilence(seconds: Double = 1.6) {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: seconds, repeats: false) { [weak self] _ in
            guard let self, self.micActive else { return }
            self.stopListening(send: !self.transcript.isEmpty)
        }
    }

    func stopListening(send: Bool) {
        silenceTimer?.invalidate(); silenceTimer = nil
        audioEngine.inputNode.removeTap(onBus: 0)
        audioEngine.stop()
        recRequest?.endAudio(); recRequest = nil
        recTask?.cancel(); recTask = nil
        let wasCapture = earMode == .capture
        earMode = .off
        micActive = false
        pushLive()
        let q = transcript.trimmingCharacters(in: .whitespaces)
        transcript = ""
        if send, !q.isEmpty { ask(q) }
        else if wasCapture { DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { self.startWakeWatch() } }
    }

    /// ping both local engines; the menu shows the result live
    func checkEngines() {
        Task {
            let ping = { (url: String) async -> Bool in
                guard let u = URL(string: url) else { return false }
                var r = URLRequest(url: u); r.timeoutInterval = 2
                return (try? await URLSession.shared.data(for: r)) != nil
            }
            let llm = await ping("http://127.0.0.1:11434/api/tags")
            let tts = await ping("http://127.0.0.1:8000/")
            await MainActor.run { self.llmUp = llm; self.ttsUp = tts }
        }
    }

    func editLayout() {
        js("window.larEditMode && window.larEditMode(true)")
    }

    func newConversation() {
        history.removeAll()
        reply("HEY LAR", "Fresh start", "Conversation cleared. The facts stay; the thread is new.")
    }

        func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        if m.name == "lar" {
            DispatchQueue.main.async {
                self.listening.toggle()
                if self.listening { self.startListening() }
                else { self.stopListening(send: false) }
            }
        }
    }

    func ask(_ q: String) {
        busy = true
        resetSpeech()
        reply("HEY LAR", q, "\u{2026}")
        Task {
            do {
                try await stream(q)
            } catch {
                await MainActor.run {
                    self.reply("HEY LAR", "The model is not answering",
                        "Is Ollama running on the Mac? ollama serve, then ollama pull qwen3:4b-instruct. (\(error.localizedDescription))")
                }
            }
            await MainActor.run { self.busy = false; self.listening = false }
        }
    }

    /// Ollama native /api/chat, streamed NDJSON. Thinking stays private; an
    /// [OPEN:xx] prefix switches the tab and never reaches the sheet.
    private func stream(_ q: String) async throws {
        history.append(["role": "user", "content": q])
        if history.count > 12 { history.removeFirst(history.count - 12) }

        var req = URLRequest(url: URL(string: "http://127.0.0.1:11434/api/chat")!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 180
        let body: [String: Any] = [
            "model": "qwen3:4b-instruct",
            "messages": [["role": "system", "content": system]] + history,
            "stream": true,
            "think": false
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        struct Chunk: Decodable {
            struct M: Decodable { let content: String? }
            let message: M?
            let done: Bool?
        }

        let (bytes, _) = try await URLSession.shared.bytes(for: req)
        var full = "", shown = "", inThink = false
        var dispatched = Set<String>()
        var lastPaint = Date.distantPast

        for try await line in bytes.lines {
            guard let d = line.data(using: .utf8),
                  let c = try? JSONDecoder().decode(Chunk.self, from: d) else { continue }
            if let t = c.message?.content, !t.isEmpty {
                full += t
                // strip a private <think> block if the model emits one anyway
                if full.contains("<think>") && !full.contains("</think>") { inThink = true; continue }
                if let r = full.range(of: "</think>") { full = String(full[r.upperBound...]); inThink = false }
                var visible = full
                // leading command tags: act once each, display never
                while let junk = visible.range(of: #"^\s*\[[A-Z]+:[a-z|,]+\]\s*"#, options: .regularExpression),
                      visible.range(of: #"^\s*\[(OPEN|SCENE|ON|OFF):[a-z]+\]\s*"#, options: .regularExpression) == nil {
                    visible.removeSubrange(junk)
                }
                while let r = visible.range(of: #"^\s*\[(OPEN|SCENE|ON|OFF):[a-z]+\]\s*"#, options: .regularExpression) {
                    let tag = String(visible[r]).trimmingCharacters(in: .whitespaces)
                    visible.removeSubrange(r)
                    if dispatched.contains(tag) { continue }
                    dispatched.insert(tag)
                    if let code = Self.action(for: tag) {
                        await MainActor.run { self.js(code) }
                    }
                }
                if visible.hasPrefix("[") && visible.count < 16 { continue } // a tag may still be forming
                shown = visible.trimmingCharacters(in: .whitespacesAndNewlines)
                // speak each finished sentence immediately (min length guards
                // against "1." style fragments); Apple fallback waits for the end
                while true {
                    let tail = String(shown.dropFirst(spokenChars))
                    guard let r = tail.range(of: #"[.!?](\s|$)"#, options: .regularExpression) else { break }
                    let cut = tail.distance(from: tail.startIndex, to: r.upperBound)
                    let sentence = String(tail.prefix(cut))
                    if sentence.trimmingCharacters(in: .whitespaces).count < 20 { break }
                    spokenChars += cut
                    await MainActor.run { self.enqueueSpeech(sentence) }
                }
                if Date().timeIntervalSince(lastPaint) > 0.12 {
                    lastPaint = Date()
                    let s = shown
                    await MainActor.run { self.reply("HEY LAR", q, s) }
                }
            }
            if c.done == true { break }
        }
        shown = shown.isEmpty ? "(no answer)" : shown
        history.append(["role": "assistant", "content": shown])
        let s = shown
        await MainActor.run {
            self.reply("HEY LAR", q, s)
            if self.neuralFailed || self.spokenChars == 0 {
                self.speak(s)                    // engine was down: one clean read
            } else {
                self.enqueueSpeech(String(s.dropFirst(self.spokenChars)))
            }
        }
    }

    /// One tag -> one line of page JS. Unknown tags are ignored, never shown.
    private static func action(for tag: String) -> String? {
        let parts = tag.dropFirst().dropLast().split(separator: ":").map(String.init)
        guard parts.count == 2 else { return nil }
        let arg = parts[1]
        switch parts[0] {
        case "OPEN":
            guard ["hm","mu","we","he","mv"].contains(arg) else { return nil }
            return "document.getElementById('t-\(arg)') && document.getElementById('t-\(arg)').click()"
        case "SCENE":
            guard ["movie","wind","focus","morning"].contains(arg) else { return nil }
            return "window.larScene && window.larScene('\(arg)')"
        case "ON", "OFF":
            guard let k = ["lights": "on", "heat": "heat", "lock": "lock", "dnd": "dnd"][arg] else { return nil }
            return "window.larToggle && window.larToggle('\(k)', \(parts[0] == "ON"))"
        default: return nil
        }
    }

    /// hand one sentence to the neural voice; sentences play back-to-back
    private func enqueueSpeech(_ text: String) {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard voiceOn, !t.isEmpty, !neuralFailed else { return }
        sentenceQueue.append(t)
        pumpSpeech()
    }

    private func pumpSpeech() {
        guard !neuralBusy, !sentenceQueue.isEmpty else { return }
        let next = sentenceQueue.removeFirst()
        neuralBusy = true
        Task {
            if await self.speakNeural(next) { return }   // delegate pumps the next one
            await MainActor.run {
                self.neuralFailed = true                  // engine down mid-answer:
                self.sentenceQueue.removeAll()            // the final Apple read takes over
                self.neuralBusy = false
                self.speaking = false
            }
        }
    }

    private func resetSpeech() {
        sentenceQueue.removeAll()
        neuralBusy = false
        neuralFailed = false
        spokenChars = 0
        player?.stop()
        if voice.isSpeaking { voice.stopSpeaking(at: .immediate) }
        speaking = false
    }

    private func reply(_ k: String, _ t: String, _ b: String) {
        let esc = { (s: String) in s.replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: " ") }
        js("window.larReply('\(esc(k))','\(esc(t))','\(esc(b))')")
    }

    private func js(_ code: String) { webView?.evaluateJavaScript(code) }

    /// Lar's voice, 2026 grade: a local neural TTS (Kokoro on the Mac, same
    /// pattern as the language model) speaks first; when that engine is not
    /// running, the best premium/enhanced Apple voice installed steps in.
    /// Nothing ever leaves the machine.
    private func speak(_ text: String) {
        guard voiceOn, !text.isEmpty else { return }
        Task {
            if await speakNeural(text) { return }
            await MainActor.run { self.speakApple(text) }
        }
    }

    private func speakNeural(_ text: String) async -> Bool {
        guard let url = URL(string: "http://127.0.0.1:8000/v1/audio/speech") else { return false }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 20
        let body: [String: Any] = ["model": "prince-canuma/Kokoro-82M", "input": text,
                                   "voice": "bf_emma", "lang_code": "b", "response_format": "wav", "speed": 1.0]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard (resp as? HTTPURLResponse)?.statusCode == 200, data.count > 1000 else { return false }
            return await MainActor.run {
                self.player = try? AVAudioPlayer(data: data)
                self.player?.delegate = self
                self.speaking = self.player != nil
                self.player?.play()
                return self.player != nil
            }
        } catch { return false }
    }

    private func speakApple(_ text: String) {
        if voice.isSpeaking { voice.stopSpeaking(at: .immediate) }
        let u = AVSpeechUtterance(string: text)
        u.rate = 0.5
        u.pitchMultiplier = 0.98
        u.postUtteranceDelay = 0.05
        if let v = Self.bestAppleVoice { u.voice = v }
        voice.speak(u)
    }

    /// premium beats enhanced beats compact; Irish and British English first.
    private static let bestAppleVoice: AVSpeechSynthesisVoice? = {
        let langs = ["en-IE", "en-GB", "en-AU", "en-US"]
        let all = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("en") }
        func score(_ v: AVSpeechSynthesisVoice) -> Int {
            var n = 0
            if #available(iOS 16.0, *), v.quality == .premium { n += 200 }
            if v.quality == .enhanced { n += 100 }
            if let i = langs.firstIndex(of: v.language) { n += 50 - i * 10 }
            if v.name.contains("Siri") { n -= 500 }   // not selectable for playback
            return n
        }
        let best = all.max { score($0) < score($1) }
        if let b = best { print("Lar voice:", b.name, b.language, b.quality.rawValue) }
        return best
    }()
}

/// the Apple-Intelligence-style breathing border: alive while Lar listens,
/// calmer while she speaks, gone when idle. Purely decorative, never blocks touch.
struct EdgeGlow: View {
    var active: Bool
    var speaking: Bool

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate
            let angle = Angle.degrees((t * 40).truncatingRemainder(dividingBy: 360))
            let breathe = 1 + 0.18 * sin(t * (speaking ? 2.2 : 3.4))
            let colors: [Color] = [.blue, .purple, .pink, .orange, .yellow, .cyan, .blue]
            let grad = AngularGradient(colors: colors, center: .center, angle: angle)
            ZStack {
                RoundedRectangle(cornerRadius: 56, style: .continuous)
                    .strokeBorder(grad, lineWidth: (speaking ? 6 : 10) * breathe)
                    .blur(radius: speaking ? 8 : 12)
                RoundedRectangle(cornerRadius: 56, style: .continuous)
                    .strokeBorder(grad, lineWidth: 2.5)
                    .blur(radius: 0.6)
                    .opacity(0.9)
            }
        }
        .padding(1)
        .ignoresSafeArea()
        .opacity(active ? 1 : 0)
        .animation(.easeInOut(duration: 0.45), value: active)
        .allowsHitTesting(false)
    }
}

struct LarWebView: UIViewRepresentable {
    let bridge: LarBridge

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.userContentController.add(bridge, name: "lar")
        let wv = WKWebView(frame: .zero, configuration: cfg)
        wv.isOpaque = false
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        bridge.webView = wv
        if let url = Bundle.main.url(forResource: "lar", withExtension: "html", subdirectory: "Web") {
            wv.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return wv
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
