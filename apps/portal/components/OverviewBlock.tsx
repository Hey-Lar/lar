'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@lar/ui';
import type { AgendaItem } from '../lib/agenda-demo';
import { currentItem, nextUpcoming } from '../lib/agenda-demo';
import { GlobalAsk } from './GlobalAsk';

interface Glance {
  netWorthEur: number;
  history: number[];
  source: string;
}

interface AgendaPayload {
  items: AgendaItem[];
  asOfMs: number;
}

const eur = (n: number) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

function fmtAgendaTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function greeting(h: number): string {
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const QUICK: Array<{ tab: string; label: string; desc: string; ico: IconName }> = [
  {
    tab: 'weather',
    label: 'Weather',
    desc: 'Live local forecast — keyless, no tracking',
    ico: 'weather',
  },
  {
    tab: 'place',
    label: 'Places',
    desc: 'Find a place — open-data first, your map',
    ico: 'places',
  },
  {
    tab: 'music',
    label: 'Music',
    desc: 'Play anything — your platform, your choice',
    ico: 'music',
  },
  { tab: 'podcasts', label: 'Podcasts', desc: 'Find a show + its open RSS feed', ico: 'podcasts' },
  { tab: 'books', label: 'Books', desc: 'Find a book — library-first, your store', ico: 'books' },
  {
    tab: 'film',
    label: 'Film & TV',
    desc: 'Where to watch — JustWatch-led, neutral',
    ico: 'film',
  },
  { tab: 'health', label: 'Health', desc: 'Steps & sleep — local-first, private', ico: 'health' },
  {
    tab: 'remember',
    label: 'Remember',
    desc: 'Private memory — encrypted on this device',
    ico: 'lock',
  },
  {
    tab: 'translate',
    label: 'Translate',
    desc: 'Quick translate, then route outward',
    ico: 'languages',
  },
  { tab: 'news', label: 'News', desc: 'Neutral sources for any topic — no lock-in', ico: 'news' },
];

export function OverviewBlock({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [now, setNow] = useState<Date | null>(null);
  const [fin, setFin] = useState<Glance | null>(null);
  const [agenda, setAgenda] = useState<AgendaPayload | null>(null);

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

  useEffect(() => {
    let alive = true;
    fetch('/api/agenda')
      .then((r) => r.json())
      .then((d) => alive && setAgenda({ items: d.items, asOfMs: d.asOfMs }))
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

  const nowMs = now ? now.getTime() : (agenda?.asOfMs ?? 0);
  const agendaNext = agenda
    ? (currentItem(agenda.items, nowMs) ?? nextUpcoming(agenda.items, nowMs))
    : null;
  const agendaRunning =
    agenda &&
    nowMs >= (agendaNext?.startMs ?? Infinity) &&
    nowMs < (agendaNext?.endMs ?? -Infinity);

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

      <GlobalAsk onNavigate={onNavigate} />

      <p className="lead">
        Your home, one surface. Control your media, money, health and home — and Lar routes you to
        the best place for each thing, instead of locking you in. You own the algorithm.
      </p>

      <button className="card ov-net" onClick={() => onNavigate('wealth')}>
        <div className="eyebrow">Net worth · read-only</div>
        <div className="gradnum sm">{fin ? eur(fin.netWorthEur) : '—'}</div>
        {fin && fin.history.length >= 2 && (
          <div className={`delta ${delta >= 0 ? 'pos' : 'neg'}`}>
            <Icon
              name="chevron"
              direction={delta >= 0 ? 'up' : 'down'}
              size={14}
              className="delta-arrow"
            />
            {delta >= 0 ? '+' : '−'}
            {eur(Math.abs(delta))} · {fin.history.length}w
            <span className="dim"> · {fin.source === 'demo' ? 'demo data' : 'your data'}</span>
          </div>
        )}
        <div className="ov-go">
          Open Wealth <Icon name="route" size={14} className="ov-go-arrow" />
        </div>
      </button>

      {agendaNext && (
        <button
          className="card ov-net"
          onClick={() => onNavigate('agenda')}
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
        >
          <div className="eyebrow">{agendaRunning ? 'Now · agenda' : 'Up next · agenda'}</div>
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 24,
              fontWeight: 500,
              marginTop: 4,
              color: 'var(--ink)',
            }}
          >
            {agendaNext.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
            {fmtAgendaTime(agendaNext.startMs)} – {fmtAgendaTime(agendaNext.endMs)}
            {agendaNext.location ? ` · ${agendaNext.location}` : ''} · {agenda?.items.length ?? 0}{' '}
            on today's schedule
          </div>
          <div className="ov-go">
            Open Agenda <Icon name="route" size={14} className="ov-go-arrow" />
          </div>
        </button>
      )}

      <div className="ov-eyebrow-group">Jump to</div>
      <div className="ov-grid">
        {QUICK.map((q, i) => (
          <button
            key={q.tab}
            className="card ov-chip"
            onClick={() => onNavigate(q.tab)}
            style={{ ['--i' as string]: i }}
            aria-label={`Open ${q.label}`}
          >
            <div className="ov-ico" aria-hidden>
              <Icon name={q.ico} size={22} />
            </div>
            <div className="ov-card-t">{q.label}</div>
          </button>
        ))}
        <div className="card ov-chip ov-soon" style={{ ['--i' as string]: QUICK.length }}>
          <div className="ov-ico" aria-hidden>
            <Icon name="smart-home" size={22} />
          </div>
          <div className="ov-card-t">Home</div>
          <span className="ov-soon-tag">Soon</span>
        </div>
      </div>
    </div>
  );
}
