'use client';

import { useEffect, useMemo, useState } from 'react';

interface Platform {
  key: string;
  name: string;
}

const PLATFORMS: Platform[] = [
  { key: 'tidal', name: 'Tidal' },
  { key: 'apple_music', name: 'Apple Music' },
  { key: 'spotify', name: 'Spotify' },
  { key: 'youtube_music', name: 'YouTube Music' },
  { key: 'soundcloud', name: 'SoundCloud' },
];

/**
 * Static "Available on" preview — the marketing site never calls /api/lar.
 * Cycles which row is "chosen" every few seconds so the page feels alive
 * without the visitor having to type. The narration text under the demo
 * names which platform Lar would route to and why.
 */
export function AvailableOnDemo() {
  const [chosen, setChosen] = useState<string>('tidal');

  // Cycle on the client only — server-side render keeps the default
  // "Tidal" so SSR + hydration agree on the first paint.
  useEffect(() => {
    const order = ['tidal', 'apple_music', 'spotify', 'youtube_music', 'tidal'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % order.length;
      setChosen(order[i]!);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const reason = useMemo(() => REASONS[chosen] ?? 'next on your priority list', [chosen]);

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Available on · cross-platform
      </div>
      <ul className="avail-list" aria-live="polite">
        {PLATFORMS.map((p) => (
          <li key={p.key} className={`avail-row${p.key === chosen ? ' chosen' : ''}`}>
            <span className="avail-name">{p.name}</span>
            <span className="avail-chip">{p.key === chosen ? 'Routing here' : 'Available'}</span>
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 14, lineHeight: 1.55 }}>
        Lar honours <strong>{PLATFORMS.find((p) => p.key === chosen)?.name}</strong> — {reason}. You
        can pin a different ranked order any time; the platforms never get to decide.
      </p>
    </div>
  );
}

const REASONS: Record<string, string> = {
  tidal: 'you said "on Tidal" explicitly — that always wins',
  apple_music: 'next on your priority list and lossless is on',
  spotify: 'your default fallback when no platform is explicit',
  youtube_music: 'free-tier fallback — no subscription required',
  soundcloud: 'where this artist publishes first',
};
