'use client';

import { useEffect, useState } from 'react';

interface Glance {
  netWorthEur: number;
  history: number[];
  source: string;
}

const eur = (n: number) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

function greeting(h: number): string {
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const QUICK: Array<{ tab: string; label: string; desc: string; ico: string }> = [
  { tab: 'music', label: 'Music', desc: 'Play anything — your platform, your choice', ico: '♪' },
  { tab: 'podcasts', label: 'Podcasts', desc: 'Find a show + its open RSS feed', ico: '🎙' },
  { tab: 'health', label: 'Health', desc: 'Steps & sleep — local-first, private', ico: '♥' },
];

export function OverviewBlock({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [now, setNow] = useState<Date | null>(null);
  const [fin, setFin] = useState<Glance | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/finance')
      .then((r) => r.json())
      .then((d) => alive && setFin(d.snapshot ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const hh = now ? String(now.getHours()).padStart(2, '0') : '--';
  const mm = now ? String(now.getMinutes()).padStart(2, '0') : '--';
  const ss = now ? String(now.getSeconds()).padStart(2, '0') : '--';
  const dateStr = now
    ? now.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  const greet = now ? greeting(now.getHours()) : 'Hello';
  const delta =
    fin && fin.history.length >= 2 ? fin.history[fin.history.length - 1]! - fin.history[0]! : 0;

  return (
    <div className="block-pad">
      <div className="ov-top">
        <div>
          <div className="eyebrow">Hey Lar</div>
          <h1 className="h1">{greet}</h1>
          <div className="ov-date">{dateStr}</div>
        </div>
        <div className="ov-clock">
          {hh}:{mm}
          <span className="ov-sec">:{ss}</span>
        </div>
      </div>

      <p className="lead">
        Your home, one surface. Control your media, money, health and home — and Lar routes you to
        the best place for each thing, instead of locking you in. You own the algorithm.
      </p>

      <button className="card ov-net" onClick={() => onNavigate('wealth')}>
        <div className="eyebrow">Net worth · read-only</div>
        <div className="gradnum sm">{fin ? eur(fin.netWorthEur) : '—'}</div>
        {fin && fin.history.length >= 2 && (
          <div className={`delta ${delta >= 0 ? 'pos' : 'neg'}`}>
            {delta >= 0 ? '▲ +' : '▼ −'}
            {eur(Math.abs(delta))} · {fin.history.length}w
            <span className="dim"> · {fin.source === 'demo' ? 'demo data' : 'your data'}</span>
          </div>
        )}
        <div className="ov-go">Open Wealth →</div>
      </button>

      <div className="ov-grid">
        {QUICK.map((q) => (
          <button key={q.tab} className="card ov-card" onClick={() => onNavigate(q.tab)}>
            <div className="ov-ico" aria-hidden>
              {q.ico}
            </div>
            <div className="ov-card-t">{q.label}</div>
            <div className="ov-card-d">{q.desc}</div>
            <div className="ov-go">Open →</div>
          </button>
        ))}
        <div className="card ov-card ov-soon">
          <div className="ov-ico" aria-hidden>
            ⌂
          </div>
          <div className="ov-card-t">Home</div>
          <div className="ov-card-d">Lights, climate &amp; scenes over Matter</div>
          <div className="ov-go dim">Android phase →</div>
        </div>
      </div>
    </div>
  );
}
