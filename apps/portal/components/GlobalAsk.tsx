'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@lar/ui';
import { AskBar } from './AskBar';
import type { SpeechRecognitionLike } from '../lib/useAskLar';

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

// Weather special-case (client-side, no /api/lar call)
const WEATHER_RE = /\b(weather|forecast|temperature|rain|sunny|how (warm|cold|hot))\b/i;

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
  const [weatherRoute, setWeatherRoute] = useState(false);

  const inflightRef = useRef<AbortController | null>(null);

  // Abort on unmount
  useEffect(() => {
    return () => {
      inflightRef.current?.abort();
    };
  }, []);

  function run(transcript: string) {
    if (!transcript.trim()) return;

    // Weather special-case — handle client-side, never post to /api/lar
    if (WEATHER_RE.test(transcript)) {
      setWeatherRoute(true);
      setResult(null);
      setErr(null);
      return;
    }

    setWeatherRoute(false);
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
    rec.onend = () => setListening(false);
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
        Try: &ldquo;play Mr Brightside&rdquo;, &ldquo;define serendipity&rdquo;, &ldquo;where can I
        watch Dune&rdquo;, &ldquo;directions to Time Out Market&rdquo;
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

      {err && <div className="err">{err}</div>}

      {/* Weather special-case */}
      {weatherRoute && !loading && (
        <div className="np card">
          <div className="eyebrow">Routing you to Weather</div>
          <div className="np-title" style={{ marginTop: 8 }}>
            Live local forecast
          </div>
          <button
            className="chip"
            style={{ marginTop: 12, cursor: 'pointer', border: 'none', background: 'none' }}
            onClick={() => onNavigate('weather')}
          >
            Open Weather <Icon name="route" size={14} className="chip-arrow" />
          </button>
        </div>
      )}

      {/* Resolved result with a usable summary */}
      {summary && (
        <div className="np card">
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
            className="chip"
            style={{ marginTop: 10, cursor: 'pointer', border: '1px solid var(--stroke)' }}
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
      {result && !summary && !weatherRoute && (
        <div className="note" style={{ padding: '10px 0' }}>
          {result.note ?? "I couldn't route that — try one of the tabs."}
        </div>
      )}
    </div>
  );
}
