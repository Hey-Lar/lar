'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@lar/ui';
import { AskBar } from './AskBar';
import type { SpeechRecognitionLike } from '../lib/useAskLar';
import { classifyRoom, type RoomRoute } from '../lib/room-router';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnyResolution = {
  title?: string;
  artist?: string;
  author?: string;
  name?: string;
  address?: string;
  word?: string;
  phonetic?: string;
  openUrl?: string;
  applePodcastsUrl?: string;
  links?: Record<string, string>;
};

interface RouteSummary {
  label: string;
  tab: string;
  title: string;
  openLabel: string;
  openUrl?: string;
}

interface LarResult {
  kind: string;
  resolution: AnyResolution | null;
  note?: string;
}

// ---------------------------------------------------------------------------
// summarise
// ---------------------------------------------------------------------------

function summarise(kind: string, r: AnyResolution): RouteSummary | null {
  switch (kind) {
    case 'music':
      return {
        label: 'Music',
        tab: 'music',
        title: `${r.title ?? '?'} — ${r.artist ?? '?'}`,
        openLabel: 'Open in Music app',
        openUrl: r.openUrl,
      };
    case 'podcast':
      return {
        label: 'Podcasts',
        tab: 'podcasts',
        title: r.title ?? '?',
        openLabel: 'Open in Apple Podcasts',
        openUrl: r.applePodcastsUrl ?? r.links?.apple_podcasts,
      };
    case 'book':
      return {
        label: 'Books',
        tab: 'books',
        title: r.title ?? '?',
        openLabel: 'Borrow from a library',
        openUrl: r.links?.library,
      };
    case 'film':
      return {
        label: 'Film & TV',
        tab: 'film',
        title: r.title ?? '?',
        openLabel: 'Where to watch',
        openUrl: r.links?.justwatch,
      };
    case 'place':
      return {
        label: 'Places',
        tab: 'place',
        title: r.name ?? '?',
        openLabel: 'Open in OpenStreetMap',
        openUrl: r.links?.openstreetmap,
      };
    case 'define':
      return {
        label: 'Dictionary',
        tab: 'define',
        title: r.word ?? '?',
        openLabel: 'Open in Wiktionary',
        openUrl: r.links?.wiktionary,
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlobalAsk({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<LarResult | null>(null);
  const [roomRoute, setRoomRoute] = useState<RoomRoute | null>(null);

  const inflightRef = useRef<AbortController | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // Abort the request + stop speech recognition on unmount
  useEffect(() => {
    return () => {
      inflightRef.current?.abort();
      const rec = recRef.current;
      if (rec) {
        // Detach handlers before stopping so no callback fires setState after unmount.
        rec.onresult = () => {};
        rec.onerror = () => {};
        rec.onend = () => {};
        rec.stop();
        recRef.current = null;
      }
    };
  }, []);

  function run(transcript: string) {
    if (!transcript.trim()) return;

    // Internal-Room request (weather, news, agenda, markets, …)? Route client-side
    // — never post to /api/lar (which would otherwise default it to a music search).
    const room = classifyRoom(transcript);
    if (room) {
      // Abort any in-flight /api/lar first, else its late resolution would
      // render a second (result) card alongside this room card.
      inflightRef.current?.abort();
      inflightRef.current = null;
      setLoading(false);
      setRoomRoute(room);
      setResult(null);
      setErr(null);
      return;
    }

    setRoomRoute(null);
    inflightRef.current?.abort();
    const ctrl = new AbortController();
    inflightRef.current = ctrl;
    setLoading(true);
    setErr(null);
    setResult(null);

    void (async () => {
      try {
        const r = await fetch('/api/lar', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // No forceDomain — the parser picks the domain
          body: JSON.stringify({ transcript }),
          signal: ctrl.signal,
        });
        const d = (await r.json()) as {
          ok: boolean;
          kind?: string;
          resolution?: AnyResolution | null;
          note?: string;
          error?: string;
        };
        if (ctrl.signal.aborted) return;
        if (!d.ok) throw new Error(d.error ?? 'request failed');
        setResult({
          kind: d.kind ?? '',
          resolution: d.resolution ?? null,
          note: d.note,
        });
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        setErr((e as Error).message);
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
      setErr('Voice capture is not supported in this browser — type your request instead.');
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? '';
      setText(t);
      run(t);
    };
    rec.onerror = () => setErr('Mic error — try typing.');
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.start();
  }

  // Derive summary from result
  const summary = result && result.resolution ? summarise(result.kind, result.resolution) : null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>
        Hey Lar — ask for anything
      </div>
      <div className="note" style={{ marginBottom: 12 }}>
        Try: &ldquo;play Mr Brightside&rdquo;, &ldquo;what&rsquo;s my net worth&rdquo;,
        &ldquo;translate good morning to French&rdquo;, &ldquo;where can I watch Dune&rdquo;
      </div>

      <AskBar
        value={text}
        onChange={setText}
        onSubmit={() => run(text)}
        onMic={mic}
        loading={loading}
        listening={listening}
        placeholder="Ask Lar anything…"
      />

      {err && (
        <div className="err" role="alert">
          {err}
        </div>
      )}

      {/* Internal-Room routing card (weather, news, agenda, markets, wealth, …) */}
      {roomRoute && !loading && (
        <div className="np card" key={roomRoute.tab} role="status" aria-live="polite">
          <div className="eyebrow">Routing you to {roomRoute.label}</div>
          <button
            className="chip chip--ghost"
            style={{ marginTop: 12, cursor: 'pointer' }}
            onClick={() => onNavigate(roomRoute.tab)}
          >
            Open {roomRoute.label} <Icon name="route" size={14} className="chip-arrow" />
          </button>
        </div>
      )}

      {/* Resolved result with a usable summary */}
      {summary && (
        <div className="np card" key={summary.title ?? 'note'} role="status" aria-live="polite">
          <div className="eyebrow">Routing you to {summary.label}</div>
          <div className="np-title" style={{ marginTop: 8 }}>
            {summary.title}
          </div>
          {summary.openUrl && (
            <a
              className="open"
              href={summary.openUrl}
              target="_blank"
              rel="noreferrer"
              style={{ marginTop: 14, display: 'inline-block' }}
            >
              {summary.openLabel} <Icon name="route" size={14} className="chip-arrow" />
            </a>
          )}
          <button
            className="chip chip--bordered"
            style={{ marginTop: 10, cursor: 'pointer' }}
            onClick={() => onNavigate(summary.tab)}
          >
            Open {summary.label} tab <Icon name="route" size={14} className="chip-arrow" />
          </button>
          <div className="note" style={{ marginTop: 10 }}>
            Lar routes you outward — your choice of app. Read-only.
          </div>
        </div>
      )}

      {/* resolution:null (note branch) or no summary for a known kind */}
      {result && !summary && !roomRoute && (
        <div className="note" style={{ padding: '10px 0' }}>
          {result.note ?? "I couldn't route that — try one of the tabs."}
        </div>
      )}
    </div>
  );
}
