'use client';

import { useEffect, useRef, useState } from 'react';

interface Resolution {
  title: string;
  artist: string;
  chosenPlatform: string;
  openUrl: string;
  links: Record<string, string>;
  odesliPageUrl: string;
  artworkUrl?: string;
}

const LABELS: Record<string, string> = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  tidal: 'Tidal',
  youtube_music: 'YouTube Music',
  soundcloud: 'SoundCloud',
  deezer: 'Deezer',
  amazon_music: 'Amazon Music',
  odesli: 'Songlink',
};
const label = (p: string) => LABELS[p] ?? p;

export function MusicBlock() {
  const [text, setText] = useState('play something calm on Tidal');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Resolution | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  // Track the in-flight request so a second submission cancels the first.
  // Without this, a rapid "play X" / "play Y" sequence could race and
  // surface the older resolution after the newer one finished.
  const inflightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      inflightRef.current?.abort();
    };
  }, []);

  async function run(transcript: string) {
    if (!transcript.trim()) return;
    inflightRef.current?.abort();
    const ctrl = new AbortController();
    inflightRef.current = ctrl;
    setLoading(true);
    setMsg(null);
    setRes(null);
    try {
      const r = await fetch('/api/lar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript }),
        signal: ctrl.signal,
      });
      const d = await r.json();
      if (ctrl.signal.aborted) return;
      if (!d.ok) throw new Error(d.error ?? 'request failed');
      if (d.kind === 'music') {
        setRes(d.resolution ?? null);
        if (!d.resolution) setMsg(d.note ?? 'Nothing to route.');
      } else {
        setRes(null);
        setMsg(d.note ?? 'That looks like a different kind of request — try the matching tab.');
      }
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return;
      setMsg((e as Error).message);
    } finally {
      if (inflightRef.current === ctrl) {
        inflightRef.current = null;
        setLoading(false);
      }
    }
  }

  function mic() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setMsg('Voice capture is not supported in this browser — type your request instead.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? '';
      setText(t);
      void run(t);
    };
    rec.onerror = () => setMsg('Mic error — try typing.');
    rec.onend = () => setListening(false);
    rec.start();
  }

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Hey Lar</div>
          <h1 className="h1">Music</h1>
        </div>
      </div>
      <p className="lead">
        Say or type what you want. Lar finds the track and routes you to the best place to play it —
        your platform, your choice. Lar never plays the audio itself; it takes you to the official
        app.
      </p>

      <div className="ask">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run(text);
          }}
          placeholder="play something calm on Tidal"
          aria-label="Ask Lar"
        />
        <button className={`mic ${listening ? 'on' : ''}`} onClick={mic} aria-label="Speak to Lar">
          🎤
        </button>
        <button className="go" onClick={() => void run(text)} disabled={loading}>
          {loading ? '…' : 'Ask Lar'}
        </button>
      </div>

      {msg && <div className="err">{msg}</div>}

      {res && (
        <div className="np card">
          <div className="np-head">
            {res.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={res.artworkUrl} alt="" className="cover" />
            ) : null}
            <div>
              <div className="np-title">{res.title}</div>
              <div className="np-artist">{res.artist}</div>
              <div className="np-route">
                Routing to <b>{label(res.chosenPlatform)}</b>
              </div>
            </div>
          </div>
          <a className="open" href={res.openUrl} target="_blank" rel="noreferrer">
            Open in {label(res.chosenPlatform)} →
          </a>
          <div className="avail">
            <span className="avail-l">Available on</span>
            {Object.entries(res.links).map(([p, url]) => (
              <a key={p} href={url} target="_blank" rel="noreferrer" className="chip">
                {label(p)}
              </a>
            ))}
          </div>
          <div className="note">
            Lar resolves + routes — it never hosts or streams audio. Read-only · your algorithm.
          </div>
        </div>
      )}
    </div>
  );
}

/** Minimal Web Speech typings (avoid a lib dependency). */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
}
