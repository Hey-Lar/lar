'use client';

import { useEffect, useRef, useState } from 'react';

interface PodcastResolution {
  title: string;
  author: string;
  artworkUrl?: string;
  applePodcastsUrl: string;
  feedUrl?: string;
  genre?: string;
  links: Partial<Record<'apple_podcasts' | 'rss' | 'spotify' | 'youtube', string>>;
}

export function PodcastsBlock() {
  const [text, setText] = useState('find the Lex Fridman podcast');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<PodcastResolution | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(false);
  // Race / leak guards: abort prior request when a new one starts and
  // on unmount; clear the "Copied ✓" reset-timer on unmount.
  const inflightRef = useRef<AbortController | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      inflightRef.current?.abort();
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
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
        body: JSON.stringify({ transcript, forceDomain: 'podcast' }),
        signal: ctrl.signal,
      });
      const d = await r.json();
      if (ctrl.signal.aborted) return;
      if (!d.ok) throw new Error(d.error ?? 'request failed');
      if (d.kind === 'podcast' && d.resolution) {
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

  async function copyRss(feedUrl: string) {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      // Cancel any prior reset still pending — keeps the "✓" visible for
      // exactly 2s after the LATEST copy click instead of an earlier one,
      // and the unmount-effect above clears the handle if we navigate away.
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => {
        copyResetRef.current = null;
        setCopied(false);
      }, 2000);
    } catch {
      setMsg('Could not copy — please copy the URL manually.');
    }
  }

  const feedUrl = res?.links.rss ?? res?.feedUrl;
  const appleUrl = res?.links.apple_podcasts ?? res?.applePodcastsUrl;

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Hey Lar</div>
          <h1 className="h1">Podcasts</h1>
        </div>
      </div>
      <p className="lead">
        Say or type a podcast you want. Lar finds it and routes you to Apple Podcasts or your feed
        reader — it never streams audio itself.
      </p>

      <div className="ask">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run(text);
          }}
          placeholder="find the Lex Fridman podcast"
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
              <img
                src={res.artworkUrl}
                alt=""
                className="cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <div>
              <div className="np-title">{res.title}</div>
              <div className="np-artist">{res.author}</div>
            </div>
          </div>

          {appleUrl && (
            <a className="open" href={appleUrl} target="_blank" rel="noreferrer">
              Open in Apple Podcasts →
            </a>
          )}

          {feedUrl && (
            <button
              className="chip"
              style={{ alignSelf: 'flex-start', cursor: 'pointer', border: 'none' }}
              onClick={() => void copyRss(feedUrl)}
            >
              {copied ? 'Copied ✓' : 'Copy RSS feed'}
            </button>
          )}

          {(res.links.spotify || res.links.youtube) && (
            <div className="avail">
              <span className="avail-l">Find on</span>
              {res.links.spotify && (
                <a href={res.links.spotify} target="_blank" rel="noreferrer" className="chip">
                  Spotify
                </a>
              )}
              {res.links.youtube && (
                <a href={res.links.youtube} target="_blank" rel="noreferrer" className="chip">
                  YouTube
                </a>
              )}
            </div>
          )}

          <div className="note">
            Lar routes you out — it never streams audio. Read-only · your algorithm.
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
