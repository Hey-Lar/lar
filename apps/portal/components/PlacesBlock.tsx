'use client';

import { useEffect, useRef, useState } from 'react';
// Use the connector's exported (total) resolution type so the contract — every
// map link is always present — propagates end-to-end and the primary OSM CTA
// can never silently disappear behind a Partial.
import type { PlaceResolution } from '@lar/connector-places';

export function PlacesBlock() {
  const [text, setText] = useState('Time Out Market Lisbon');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<PlaceResolution | null>(null);
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
        body: JSON.stringify({ transcript, forceDomain: 'place' }),
        signal: ctrl.signal,
      });
      const d = await r.json();
      if (ctrl.signal.aborted) return;
      if (!d.ok) throw new Error(d.error ?? 'request failed');
      if (d.kind === 'place' && d.resolution) {
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
          <h1 className="h1">Places</h1>
        </div>
      </div>
      <p className="lead">
        Say or type a place. Lar finds it via OpenStreetMap and routes you to your map app — it
        never embeds a map or stores where you are.
      </p>

      <div className="ask">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run(text);
          }}
          placeholder="Time Out Market Lisbon"
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
            <div>
              <div className="np-title">{res.name}</div>
              {res.address && <div className="np-artist">{res.address}</div>}
              {(res.category || res.type) && (
                <div className="np-artist" style={{ opacity: 0.6 }}>
                  {[res.category, res.type].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>

          {/* PRIMARY: OpenStreetMap — neutral open-data map, no commercial lock-in */}
          <a className="open" href={res.links.openstreetmap} target="_blank" rel="noreferrer">
            Open in OpenStreetMap →
          </a>

          <div className="avail">
            <span className="avail-l">Find on</span>
            <a href={res.links.directions} target="_blank" rel="noreferrer" className="chip">
              Directions
            </a>
            <a href={res.links.google_maps} target="_blank" rel="noreferrer" className="chip">
              Google Maps
            </a>
            <a href={res.links.apple_maps} target="_blank" rel="noreferrer" className="chip">
              Apple Maps
            </a>
            <a href={res.links.waze} target="_blank" rel="noreferrer" className="chip">
              Waze
            </a>
          </div>

          <div className="note">
            Lar routes you out — open-data first (OpenStreetMap), then your map app. It never tracks
            or stores where you are.
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
