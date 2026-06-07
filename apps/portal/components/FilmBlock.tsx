'use client';

import { useEffect, useRef, useState } from 'react';

interface FilmResolution {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  wikipediaUrl: string;
  links: Partial<
    Record<
      | 'justwatch'
      | 'netflix'
      | 'prime_video'
      | 'disney_plus'
      | 'apple_tv'
      | 'youtube'
      | 'letterboxd',
      string
    >
  >;
}

export function FilmBlock() {
  const [text, setText] = useState('Dune');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<FilmResolution | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  // Race / leak guards: abort prior request when a new one starts and on unmount.
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
        body: JSON.stringify({ transcript, forceDomain: 'film' }),
        signal: ctrl.signal,
      });
      const d = await r.json();
      if (ctrl.signal.aborted) return;
      if (!d.ok) throw new Error(d.error ?? 'request failed');
      if (d.kind === 'film' && d.resolution) {
        setRes(d.resolution);
      } else {
        setMsg(d.note ?? 'Nothing to route.');
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
          <h1 className="h1">Film &amp; TV</h1>
        </div>
      </div>
      <p className="lead">
        Say or type a film or show. Lar finds it on Wikipedia and routes you to JustWatch or your
        preferred streaming service — it never hosts or streams video itself.
      </p>

      <div className="ask">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run(text);
          }}
          placeholder="Dune"
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
            {res.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={res.thumbnailUrl} alt="" className="cover" />
            ) : null}
            <div>
              <div className="np-title">{res.title}</div>
              {res.description && <div className="np-artist">{res.description}</div>}
            </div>
          </div>

          {/* PRIMARY: JustWatch — the neutral aggregator, where the user picks where to watch */}
          {res.links.justwatch && (
            <a className="open" href={res.links.justwatch} target="_blank" rel="noreferrer">
              Where to watch →
            </a>
          )}

          <div className="avail">
            <span className="avail-l">Find on</span>
            {res.links.netflix && (
              <a href={res.links.netflix} target="_blank" rel="noreferrer" className="chip">
                Netflix
              </a>
            )}
            {res.links.prime_video && (
              <a href={res.links.prime_video} target="_blank" rel="noreferrer" className="chip">
                Prime Video
              </a>
            )}
            {res.links.disney_plus && (
              <a href={res.links.disney_plus} target="_blank" rel="noreferrer" className="chip">
                Disney+
              </a>
            )}
            {res.links.apple_tv && (
              <a href={res.links.apple_tv} target="_blank" rel="noreferrer" className="chip">
                Apple TV
              </a>
            )}
            {res.links.youtube && (
              <a href={res.links.youtube} target="_blank" rel="noreferrer" className="chip">
                YouTube
              </a>
            )}
            {res.links.letterboxd && (
              <a href={res.links.letterboxd} target="_blank" rel="noreferrer" className="chip">
                Letterboxd
              </a>
            )}
          </div>

          <div className="avail" style={{ marginTop: '0.5rem' }}>
            <a href={res.wikipediaUrl} target="_blank" rel="noreferrer" className="chip">
              Wikipedia ↗
            </a>
          </div>

          <div className="note">
            Lar routes you out — it never hosts or streams video. Where-to-watch is JustWatch&apos;s
            neutral index; you choose.
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
