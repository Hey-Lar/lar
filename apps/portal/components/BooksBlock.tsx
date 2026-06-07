'use client';

import { useEffect, useRef, useState } from 'react';

interface BookResolution {
  title: string;
  author: string;
  year?: number;
  coverUrl?: string;
  isbn?: string;
  openLibraryUrl: string;
  links: Partial<
    Record<'open_library' | 'library' | 'apple_books' | 'kindle' | 'kobo' | 'google_books', string>
  >;
}

export function BooksBlock() {
  const [text, setText] = useState('the pragmatic programmer');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<BookResolution | null>(null);
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
        body: JSON.stringify({ transcript, forceDomain: 'book' }),
        signal: ctrl.signal,
      });
      const d = await r.json();
      if (ctrl.signal.aborted) return;
      if (!d.ok) throw new Error(d.error ?? 'request failed');
      if (d.kind === 'book' && d.resolution) {
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
          <h1 className="h1">Books</h1>
        </div>
      </div>
      <p className="lead">
        Say or type a book you want. Lar finds it on Open Library and routes you to your library or
        preferred store — it never hosts or sells books itself.
      </p>

      <div className="ask">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run(text);
          }}
          placeholder="the pragmatic programmer"
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
            {res.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={res.coverUrl}
                alt=""
                className="cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <div>
              <div className="np-title">{res.title}</div>
              <div className="np-artist">
                {res.author}
                {res.year ? ` · ${res.year}` : ''}
              </div>
            </div>
          </div>

          {/* PRIMARY: library-first — the standout, free, anti-lock-in link */}
          {res.links.library && (
            <a className="open" href={res.links.library} target="_blank" rel="noreferrer">
              Borrow from a library →
            </a>
          )}

          <div className="avail">
            <span className="avail-l">Find on</span>
            {res.links.open_library && (
              <a href={res.links.open_library} target="_blank" rel="noreferrer" className="chip">
                Open Library
              </a>
            )}
            {res.links.apple_books && (
              <a href={res.links.apple_books} target="_blank" rel="noreferrer" className="chip">
                Apple Books
              </a>
            )}
            {res.links.kindle && (
              <a href={res.links.kindle} target="_blank" rel="noreferrer" className="chip">
                Kindle
              </a>
            )}
            {res.links.kobo && (
              <a href={res.links.kobo} target="_blank" rel="noreferrer" className="chip">
                Kobo
              </a>
            )}
            {res.links.google_books && (
              <a href={res.links.google_books} target="_blank" rel="noreferrer" className="chip">
                Google Books
              </a>
            )}
          </div>

          <div className="note">
            Lar routes you out — it never hosts or sells books. Library-first, your choice.
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
