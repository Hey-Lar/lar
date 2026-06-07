'use client';
import { useEffect, useRef, useState } from 'react';

/** Minimal Web Speech typings (avoid a lib dependency). */
export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
}

export interface AskLar<TRes> {
  text: string;
  setText: (s: string) => void;
  loading: boolean;
  listening: boolean;
  msg: string | null;
  setMsg: (msg: string | null) => void;
  res: TRes | null;
  run: (transcript: string) => void;
  mic: () => void;
}

export function useAskLar<TRes>(opts: {
  kind: string;
  forceDomain: string;
  initial: string;
}): AskLar<TRes> {
  const [text, setText] = useState(opts.initial);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<TRes | null>(null);
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

  function run(transcript: string) {
    if (!transcript.trim()) return;
    inflightRef.current?.abort();
    const ctrl = new AbortController();
    inflightRef.current = ctrl;
    setLoading(true);
    setMsg(null);
    setRes(null);
    void (async () => {
      try {
        const r = await fetch('/api/lar', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ transcript, forceDomain: opts.forceDomain }),
          signal: ctrl.signal,
        });
        const d = await r.json();
        if (ctrl.signal.aborted) return;
        if (!d.ok) throw new Error(d.error ?? 'request failed');
        if (d.kind === opts.kind && d.resolution) {
          setRes(d.resolution as TRes);
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
    })();
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
      run(t);
    };
    rec.onerror = () => setMsg('Mic error — try typing.');
    rec.onend = () => setListening(false);
    rec.start();
  }

  return { text, setText, loading, listening, msg, setMsg, res, run, mic };
}
