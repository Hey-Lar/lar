'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@lar/ui';
import { allocationSlices } from '@lar/connector-finance';

interface Snapshot {
  netWorthEur: number;
  buckets: { cash: number; investments: number; property: number; liabilities: number };
  history: number[];
  goals: Array<{ label: string; progressPct: number }>;
  emergencyFundMonths: number | null;
  alerts: Array<{ severity: 'RED' | 'AMBER' | 'GREEN'; title: string; detail: string }>;
  source: 'lumina-snapshot' | 'demo';
}

const eur = (n: number) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

type BucketKey = keyof Snapshot['buckets'];
const BUCKET_META: Record<BucketKey, { label: string; color: string }> = {
  cash: { label: 'Cash', color: '#3aa6a0' },
  investments: { label: 'Investments', color: '#d98a2b' },
  property: { label: 'Assets', color: '#6c8cff' },
  liabilities: { label: 'Liabilities', color: '#d2554d' },
};
const SEV_COLOR = { RED: '#d2554d', AMBER: '#d98a2b', GREEN: '#3aa6a0' } as const;

const W = 520;
const H = 88;
function sparkPath(history: number[]): string {
  if (history.length < 2) return '';
  const mn = Math.min(...history);
  const mx = Math.max(...history);
  const rng = mx - mn || 1;
  return history
    .map((v, i) => {
      const x = (i / (history.length - 1)) * W;
      const y = H - ((v - mn) / rng) * (H * 0.84) - H * 0.08;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function WealthBlock() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/finance')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setConnected(Boolean(d.connected));
        setSnap(d.snapshot ?? null);
      })
      .catch(() => alive && setConnected(false));
    return () => {
      alive = false;
    };
  }, []);

  if (!snap) {
    return (
      <div className="block-pad">
        <div className="head">
          <div>
            <div className="eyebrow">Read-only · view only</div>
            <h1 className="h1">Wealth</h1>
          </div>
        </div>
        <p className="lead" role="status" aria-live="polite">
          Loading…
        </p>
      </div>
    );
  }

  const first = snap.history[0] ?? snap.netWorthEur;
  const last = snap.history[snap.history.length - 1] ?? snap.netWorthEur;
  const delta = last - first;
  const slices = allocationSlices(snap.buckets);
  const isDemo = snap.source === 'demo' || !connected;
  const line = sparkPath(snap.history);

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Read-only · view only</div>
          <h1 className="h1">Wealth</h1>
        </div>
        <span className={`badge ${isDemo ? 'demo' : 'live'}`}>
          {isDemo ? 'Demo data' : 'Your data'}
        </span>
      </div>

      <div className="card wealth-hero">
        <div className="eyebrow">Net worth</div>
        <div className="gradnum">{eur(snap.netWorthEur)}</div>
        <div className={`delta ${delta >= 0 ? 'pos' : 'neg'}`}>
          <Icon
            name="chevron"
            direction={delta >= 0 ? 'up' : 'down'}
            size={14}
            className="delta-arrow"
          />
          {delta >= 0 ? '+' : '−'}
          {eur(Math.abs(delta))} · {snap.history.length}w
          {snap.emergencyFundMonths != null && (
            <span className="dim"> · {snap.emergencyFundMonths.toFixed(1)} mo runway</span>
          )}
        </div>
        {line && (
          <svg
            className="spark-svg"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(217,138,43,0.32)" />
                <stop offset="100%" stopColor="rgba(217,138,43,0)" />
              </linearGradient>
            </defs>
            <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#wfill)" />
            <path d={line} fill="none" stroke="#d98a2b" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div className="card">
        <div className="eyebrow">Allocation</div>
        <div className="alloc-bar">
          {slices.map((s) => (
            <span
              key={s.key}
              style={{ width: `${s.pct * 100}%`, background: BUCKET_META[s.key].color }}
              title={`${BUCKET_META[s.key].label} ${(s.pct * 100).toFixed(0)}%`}
            />
          ))}
        </div>
        <div className="bucket-grid" style={{ marginTop: 14 }}>
          {(Object.keys(BUCKET_META) as BucketKey[]).map((key) => (
            <div key={key} className="bucket-cell">
              <div className="eyebrow">
                <span className="swatch" style={{ background: BUCKET_META[key].color }} />
                {BUCKET_META[key].label}
              </div>
              <div className="midnum">
                {snap.buckets[key] < 0 ? '−' : ''}
                {eur(Math.abs(snap.buckets[key]))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wealth-cols">
        <div className="card">
          <div className="eyebrow">Goals</div>
          {snap.goals.map((g) => (
            <div key={g.label} className="goal">
              <div className="goal-row">
                <span>{g.label}</span>
                <span className="num">{Math.round(g.progressPct)}%</span>
              </div>
              <div className="goal-bar">
                <span style={{ width: `${Math.min(100, g.progressPct)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="eyebrow">Signals</div>
          {snap.alerts.map((a, i) => (
            <div key={`${a.title}-${i}`} className="signal-row">
              <span className="sdot" style={{ background: SEV_COLOR[a.severity] }} />
              <div>
                <div className="srow-title">{a.title}</div>
                <div className="srow-detail">{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="note">
        {isDemo
          ? 'Demo data — point LUMINA_API_BASE at your Lumina API for your real numbers. Read-only · no advice, no money movement.'
          : 'From your own Lumina snapshot · read-only aggregation · no advice, no money movement.'}
      </div>
    </div>
  );
}
