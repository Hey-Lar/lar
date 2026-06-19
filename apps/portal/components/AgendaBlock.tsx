'use client';

/**
 * BRIGHT-LINE: read-only / display-only.
 * Agenda fetched from /api/agenda (demo). Lar does not create, edit or delete
 * calendar events from this surface — it routes the user OUT to their real
 * calendar app once a Calendar MCP / OAuth is connected.
 */

import { useEffect, useMemo, useState } from 'react';
import type { AgendaItem, AgendaSource } from '../lib/agenda-demo';
import { currentItem, nextUpcoming } from '../lib/agenda-demo';

interface AgendaPayload {
  ok: boolean;
  source: 'demo';
  asOfMs: number;
  items: AgendaItem[];
}

const SOURCE_STYLE: Record<AgendaSource, { bg: string; text: string }> = {
  Calendar: { bg: 'rgba(217,138,43,0.15)', text: 'var(--hearth)' },
  Focus: { bg: 'rgba(58,166,160,0.15)', text: 'var(--teal)' },
  Wealth: { bg: 'rgba(108,140,255,0.18)', text: 'var(--info)' },
  Health: { bg: 'rgba(210,85,77,0.15)', text: 'var(--neg)' },
};

export function AgendaBlock() {
  const [data, setData] = useState<AgendaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/agenda')
      .then((r) => r.json())
      .then((d: AgendaPayload) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const upcoming = useMemo(() => {
    if (!data || now == null) return null;
    return nextUpcoming(data.items, now);
  }, [data, now]);

  const running = useMemo(() => {
    if (!data || now == null) return null;
    return currentItem(data.items, now);
  }, [data, now]);

  if (error) {
    return (
      <div className="block-pad">
        <div className="head">
          <div>
            <div className="eyebrow">Read-only · routes outward</div>
            <h1 className="h1">Agenda</h1>
          </div>
        </div>
        <p className="err" role="alert">
          Unable to load agenda: {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="block-pad">
        <div className="head">
          <div>
            <div className="eyebrow">Read-only · routes outward</div>
            <h1 className="h1">Agenda</h1>
          </div>
        </div>
        <p className="lead" role="status" aria-live="polite">
          Loading…
        </p>
      </div>
    );
  }

  const items = data.items;

  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Read-only · routes outward</div>
          <h1 className="h1">Agenda</h1>
        </div>
        <span className="badge demo">Demo data</span>
      </div>

      <p className="lead">
        Today, surfaced. Lar shows what's coming up — your real calendar app stays the source of
        truth. Connect Google or Outlook later to plug in your live schedule.
      </p>

      {/* Up-next hero card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="eyebrow">{running ? 'Now' : 'Up next'}</div>
        {running || upcoming ? (
          <AgendaHero item={(running ?? upcoming)!} now={now ?? data.asOfMs} />
        ) : (
          <div className="midnum">All clear · the day is done</div>
        )}
      </div>

      {/* Full list */}
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Today
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {items.map((it) => {
            const isRunning = running?.id === it.id;
            const isPast = (now ?? data.asOfMs) >= it.endMs;
            return (
              <li
                key={it.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr auto',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 0',
                  borderTop: '1px solid rgba(120,130,145,0.10)',
                  opacity: isPast && !isRunning ? 0.45 : 1,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 18,
                    fontWeight: 500,
                    color: isRunning ? 'var(--hearth)' : 'var(--ink)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtTime(it.startMs)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 650,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {it.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {fmtRange(it)}
                    {it.location ? ` · ${it.location}` : ''}
                  </div>
                </div>
                <SourceChip source={it.source} />
              </li>
            );
          })}
        </ul>
        {items.length === 0 && (
          <div className="note" style={{ paddingTop: 4 }}>
            Nothing scheduled for today.
          </div>
        )}
      </div>

      <div className="note" style={{ marginTop: 14 }}>
        Read-only · display-only. Lar never creates, edits, or deletes events.
      </div>
    </div>
  );
}

function AgendaHero({ item, now }: { item: AgendaItem; now: number }) {
  const minsToStart = Math.round((item.startMs - now) / 60_000);
  const minsToEnd = Math.round((item.endMs - now) / 60_000);
  const running = now >= item.startMs && now < item.endMs;
  return (
    <>
      <div
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 30,
          fontWeight: 500,
          color: 'var(--ink)',
          marginTop: 6,
        }}
      >
        {item.title}
      </div>
      <div
        style={{ display: 'flex', gap: 18, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
          {fmtRange(item)}
          {item.location ? ` · ${item.location}` : ''}
        </div>
        <SourceChip source={item.source} />
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--hearth)' }}>
          {running
            ? `${minsToEnd}m left`
            : minsToStart >= 60
              ? `in ${Math.round(minsToStart / 60)}h`
              : `in ${minsToStart}m`}
        </div>
      </div>
    </>
  );
}

function SourceChip({ source }: { source: AgendaSource }) {
  const s = SOURCE_STYLE[source];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: 999,
        background: s.bg,
        color: s.text,
        whiteSpace: 'nowrap',
      }}
    >
      {source}
    </span>
  );
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtRange(it: AgendaItem): string {
  return `${fmtTime(it.startMs)} – ${fmtTime(it.endMs)}`;
}
