'use client';

/**
 * BRIGHT-LINE: read-only, local-first, demo data only.
 * Lar never writes, syncs, uploads, or sells health data.
 * No network calls. No API keys. No real user data.
 */

import { useEffect, useState } from 'react';
import { generateHealth, type HealthSnapshot } from '../lib/health-demo';
import { Sparkline } from './Sparkline';

/** Format decimal hours as "7h 12m". */
function formatSleep(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Format a steps count with thousands separator. */
function fmt(n: number): string {
  return new Intl.NumberFormat('en-IE').format(n);
}

// Ring accent colours per key — use the theme hearth colour via CSS var for
// move, and subtle variants for exercise / stand.
const RING_COLORS: Record<string, string> = {
  move: 'var(--hearth)',
  exercise: 'var(--teal)',
  stand: '#6c8cff',
};

export function HealthBlock() {
  // Stable SSR seed: use a fixed reference that will be replaced on mount.
  // This mirrors the pattern used in AgendaBlock / OverviewBlock — start with
  // a known anchor so the server and initial client render agree, then refine
  // to the real local time on the first paint.
  const [snap, setSnap] = useState<HealthSnapshot>(() =>
    // Use a stable fixed anchor for SSR / initial hydration.
    generateHealth(new Date(2026, 5, 6, 12, 0, 0, 0).getTime()),
  );

  useEffect(() => {
    // On mount, replace with the actual current time so the data reflects today.
    setSnap(generateHealth(Date.now()));
  }, []);

  const moveRing = snap.rings.find((r) => r.key === 'move')!;

  return (
    <div className="block-pad">
      {/* Header */}
      <div className="head">
        <div>
          <div className="eyebrow">Local-first · private</div>
          <h1 className="h1">Health</h1>
        </div>
        <span className="badge demo">Demo data</span>
      </div>

      <p className="lead">
        Activity rings, steps, sleep and heart rate — kept on-device, never sold. Lar reads to show;
        it never writes, syncs, or shares your data.
      </p>

      {/* Activity rings */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>
          Activity rings
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            textAlign: 'center',
          }}
        >
          {snap.rings.map((ring) => (
            <div
              key={ring.key}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
            >
              <div
                className="ring"
                style={{
                  ['--p' as string]: `${ring.pct}%`,
                  background: `conic-gradient(${RING_COLORS[ring.key] ?? 'var(--hearth)'} var(--p, 0%), rgba(120,130,145,0.12) 0)`,
                  color: RING_COLORS[ring.key] ?? 'var(--hearth)',
                }}
              >
                <i style={{ fontSize: 15 }}>{ring.pct}%</i>
              </div>
              <div>
                <div className="eyebrow">{ring.label}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {fmt(ring.value)} / {fmt(ring.goal)} {ring.unit}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric tiles */}
      <div className="tiles" style={{ marginBottom: 14 }}>
        {/* Steps */}
        <div className="card">
          <div className="eyebrow">Steps</div>
          <div className="tile-big">{fmt(snap.steps.value)}</div>
          <div className="note">
            goal {fmt(snap.steps.goal)} · {snap.steps.pct}%
          </div>
        </div>

        {/* Sleep */}
        <div className="card">
          <div className="eyebrow">Sleep</div>
          <div className="tile-big">{formatSleep(snap.sleepHours)}</div>
          <div className="note">last night</div>
        </div>

        {/* Resting HR */}
        <div className="card">
          <div className="eyebrow">Resting HR</div>
          <div className="tile-big">{snap.restingHr}</div>
          <div className="note">bpm</div>
        </div>
      </div>

      {/* 7-day trend sparkline */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <div className="eyebrow">{snap.trendLabel}</div>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{moveRing.pct}% today</span>
        </div>
        <Sparkline data={snap.trend} width={320} height={44} />
      </div>

      {/* Bright-line note */}
      <div className="note">
        Demo data. Your health stays on-device — Lar reads to show, never writes or sells. Routes
        out to your health app.
      </div>
    </div>
  );
}
