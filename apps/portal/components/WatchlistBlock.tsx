'use client';

/**
 * BRIGHT-LINE: Read-only, display-only.
 * No buy/sell/trade/order controls anywhere in this component.
 * Backed by deterministic synthetic OHLCV — never real prices, never live ticks.
 * Lar never trades.
 */

import { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatPercent } from '@lar/shared';
import { closesOf, generateBars, type Bar } from '../lib/synthetic-ohlc';
import { Sparkline } from './Sparkline';

export interface WatchSymbol {
  symbol: string;
  name: string;
}

interface Row {
  symbol: string;
  name: string;
  last: number;
  prevClose: number;
  dayDelta: number;
  dayPct: number;
  spark: number[];
}

type SortKey = 'symbol' | 'last' | 'dayDelta' | 'dayPct';
type SortDir = 'asc' | 'desc';

const SPARK_BARS = 30;
const HISTORY_BARS = 180;

interface WatchlistBlockProps {
  symbols: WatchSymbol[];
  selected: string;
  onSelect: (symbol: string) => void;
  /**
   * Reference time used to seed the deterministic walk; defaults to a stable
   * date so server-render and client-render agree (no `Date.now()` at module
   * top-level, no hydration churn).
   */
  asOfMs: number;
}

export function WatchlistBlock({ symbols, selected, onSelect, asOfMs }: WatchlistBlockProps) {
  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const rows: Row[] = useMemo(() => {
    return symbols.map(({ symbol, name }) => {
      const bars: Bar[] = generateBars(symbol, { asOfMs, count: HISTORY_BARS });
      const last = bars.at(-1)!;
      const prev = bars.at(-2) ?? last;
      const dayDelta = last.close - prev.close;
      const dayPct = prev.close === 0 ? 0 : dayDelta / prev.close;
      return {
        symbol,
        name,
        last: last.close,
        prevClose: prev.close,
        dayDelta,
        dayPct,
        spark: closesOf(bars.slice(-SPARK_BARS)),
      };
    });
  }, [symbols, asOfMs]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [rows, sortKey, sortDir]);

  const cycleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'symbol' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        Watchlist · synthetic series · read-only
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13.5,
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-label="Watchlist"
        >
          <thead>
            <tr style={{ color: 'var(--ink-faint)', textAlign: 'left' }}>
              <SortHeader
                label="Symbol"
                k="symbol"
                active={sortKey}
                dir={sortDir}
                onClick={cycleSort}
                align="left"
              />
              <th style={{ ...thStyle, color: 'var(--ink-faint)' }}>Name</th>
              <SortHeader
                label="Last"
                k="last"
                active={sortKey}
                dir={sortDir}
                onClick={cycleSort}
                align="right"
              />
              <SortHeader
                label="Day Δ"
                k="dayDelta"
                active={sortKey}
                dir={sortDir}
                onClick={cycleSort}
                align="right"
              />
              <SortHeader
                label="Day %"
                k="dayPct"
                active={sortKey}
                dir={sortDir}
                onClick={cycleSort}
                align="right"
              />
              <th style={{ ...thStyle, color: 'var(--ink-faint)' }}>30-day</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const sign: 'up' | 'down' | 'flat' =
                r.dayDelta > 0 ? 'up' : r.dayDelta < 0 ? 'down' : 'flat';
              const isSelected = r.symbol === selected;
              return (
                <tr
                  key={r.symbol}
                  onClick={() => onSelect(r.symbol)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(r.symbol);
                    }
                  }}
                  tabIndex={0}
                  style={{
                    cursor: 'pointer',
                    borderTop: '1px solid rgba(120,130,145,0.10)',
                    background: isSelected ? 'var(--nav-active-bg)' : 'transparent',
                    outline: 'none',
                  }}
                  aria-selected={isSelected}
                >
                  <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--ink)' }}>{r.symbol}</td>
                  <td style={{ ...tdStyle, color: 'var(--ink-soft)', maxWidth: 220 }}>{r.name}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--ink)' }}>
                    {formatCurrency(r.last, { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: signColor(sign) }}>
                    {r.dayDelta >= 0 ? '+' : '−'}
                    {formatCurrency(Math.abs(r.dayDelta), { maximumFractionDigits: 2 })}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: 'right',
                      color: signColor(sign),
                      fontWeight: 700,
                    }}
                  >
                    {r.dayPct >= 0 ? '+' : '−'}
                    {formatPercent(Math.abs(r.dayPct), { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...tdStyle, paddingRight: 0 }}>
                    <Sparkline data={r.spark} sign={sign} width={88} height={22} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="note" style={{ marginTop: 12 }}>
        Synthetic data. Display-only. Click a row to load it in the chart above.
      </div>
    </div>
  );
}

function SortHeader({
  label,
  k,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  k: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align: 'left' | 'right';
}) {
  const isActive = active === k;
  return (
    <th
      scope="col"
      style={{ ...thStyle, textAlign: align, color: 'var(--ink-faint)' }}
      aria-sort={isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onClick(k)}
        style={{
          background: 'transparent',
          border: 'none',
          color: isActive ? 'var(--ink)' : 'var(--ink-faint)',
          cursor: 'pointer',
          font: 'inherit',
          letterSpacing: 'inherit',
          textTransform: 'inherit',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {label}
        {isActive ? <span aria-hidden>{dir === 'asc' ? '▲' : '▼'}</span> : null}
      </button>
    </th>
  );
}

function signColor(sign: 'up' | 'down' | 'flat'): string {
  if (sign === 'up') return 'var(--pos)';
  if (sign === 'down') return 'var(--neg)';
  return 'var(--ink-soft)';
}

const thStyle: React.CSSProperties = {
  padding: '0 10px 10px 0',
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 10px 10px 0',
  verticalAlign: 'middle',
};
