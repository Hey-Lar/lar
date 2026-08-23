import SwiftUI
import WebKit
import AVFoundation

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
                    TextField("Ask Lar…", text: $prompt)
                        .font(.system(.body, design: .monospaced))
                        .focused($focused)
                        .onSubmit(send)
                        .submitLabel(.send)
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
        lar.ask(q)
    }
}

final class LarBridge: NSObject, ObservableObject, WKScriptMessageHandler {
    @Published var listening = false
    @Published var busy = false
    @Published var voiceOn = true
    @Published var llmUp = false
    @Published var ttsUp = false
    private let voice = AVSpeechSynthesizer()
    private var player: AVAudioPlayer?
    weak var webView: WKWebView?

    /// rolling conversation, oldest first; capped so a 4B stays sharp
    private var history: [[String: String]] = []

    private let system = """
    You are Lar, the calm guardian of Alberto's home. Answer in 2-3 short sentences, plain text, no markdown.
    Facts: net worth EUR [REDACTED] (liquid [REDACTED] + pension [REDACTED] + unvested equity [REDACTED]). \
    Savings gap EUR [REDACTED], due 01 oct. Keys to the Mijas home 15 dec 2026. Tax consult 07 sep. \
    Car listed early nov (private ~[REDACTED], equity ~[REDACTED]). Rent hunt: EUR 1,300-2,100, Mijas-Marbella corridor. \
    Monthly outgoings [REDACTED], income [REDACTED], surplus 781.
    You can act on the home by STARTING your reply with one or more tags, then a short sentence. Tags: \
    [OPEN:hm|mu|we|he|mv] opens a board (home, music, wealth, health, the move). \
    [SCENE:movie|wind|focus|morning] runs a scene. \
    [ON:lights|heat|lock|dnd] and [OFF:lights|heat|lock|dnd] set a control. \
    Only use tags when the user asks you to do or show something. \
    Example - user says goodnight: "[SCENE:wind][ON:dnd][ON:lock] Warm light on, notifications held until 7:00, door locked. Sleep well, Alberto."
    """

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

    func newConversation() {
        history.removeAll()
        reply("HEY LAR", "Fresh start", "Conversation cleared. The facts stay; the thread is new.")
    }

        func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        if m.name == "lar" { DispatchQueue.main.async { self.listening.toggle() } }
    }

    func ask(_ q: String) {
        busy = true
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
            self.speak(s)
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
