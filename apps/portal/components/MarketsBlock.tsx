'use client';

/**
 * BRIGHT-LINE: Read-only, display-only.
 * No buy/sell/trade/order controls anywhere in this component.
 * No advice language. Demo data only. Lar never trades.
 */

import { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatPercent } from '@lar/shared';
import { classifySuccessBand } from '@lar/connector-finance';
import type { MonteCarloResult, DriftState, SuccessBand } from '@lar/connector-finance';
import { HeroChart } from './HeroChart';
import { WatchlistBlock, type WatchSymbol } from './WatchlistBlock';
import { buildPrimarySourceLinks } from '@lar/connector-filings';

// Stable reference time used to seed deterministic synthetic OHLCV. Fixed at
// build / module load so SSR and CSR agree on the series (no hydration churn,
// no Date.now() per render). Increment when you want fresher bars.
const MARKETS_AS_OF_MS = 1_780_704_000_000; // 2026-06-06 UTC midnight

// ---------------------------------------------------------------------------
// API response shape
// ---------------------------------------------------------------------------

interface HoldingRow {
  symbol: string;
  name: string;
  marketValue: number;
  currentWeight: number;
  targetWeight: number;
  driftPp: number;
  driftState: DriftState;
}

interface MarketsData {
  ok: boolean;
  source: 'demo';
  projection: MonteCarloResult;
  holdings: HoldingRow[];
  totalValue: number;
}

// ---------------------------------------------------------------------------
// Drift chip colours (display only — no action implied)
// ---------------------------------------------------------------------------

const DRIFT_COLOR: Record<DriftState, { bg: string; text: string; label: string }> = {
  in_band: {
    bg: 'rgba(58,166,160,0.15)',
    text: '#2a8a84',
    label: 'In band',
  },
  drifting: {
    bg: 'rgba(217,138,43,0.15)',
    text: '#a8660e',
    label: 'Drifting',
  },
  rebalance_suggested: {
    bg: 'rgba(210,85,77,0.15)',
    text: '#b83028',
    label: 'Review',
  },
};

// ---------------------------------------------------------------------------
// Allocation bar colours (matches model portfolio order)
// ---------------------------------------------------------------------------

const HOLDING_COLORS = ['#d98a2b', '#3aa6a0', '#6c8cff', '#b0bac7'];

// ---------------------------------------------------------------------------
// Success-band presentation (label + colour)
//
// Band classification is harvested from @lar/connector-finance
// (classifySuccessBand -> SuccessBand); this map only drives the display.
// ---------------------------------------------------------------------------

const SUCCESS_BAND: Record<SuccessBand, { label: string; color: string }> = {
  on_target: { label: 'On target', color: '#2a8a84' },
  good: { label: 'Good', color: '#3aa6a0' },
  fair: { label: 'Fair', color: '#d98a2b' },
  needs_attention: { label: 'Needs attention', color: '#d2554d' },
  unknown: { label: 'Unknown', color: '#d2554d' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarketsBlock() {
  const [data, setData] = useState<MarketsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('VWCE');

  useEffect(() => {
    let alive = true;
    fetch('/api/markets')
      .then((r) => r.json())
      .then((d: MarketsData) => {
        if (!alive) return;
        setData(d);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const watchSymbols: WatchSymbol[] = useMemo(
    () => (data?.holdings ?? []).map((h) => ({ symbol: h.symbol, name: h.name })),
    [data?.holdings],
  );

  if (error) {
    return (
      <div className="block-pad">
        <div className="head">
          <div>
            <div className="eyebrow">Read-only · view only</div>
            <h1 className="h1">Markets</h1>
          </div>
        </div>
        <p className="err">Unable to load analytics: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="block-pad">
        <div className="head">
          <div>
            <div className="eyebrow">Read-only · view only</div>
            <h1 className="h1">Markets</h1>
          </div>
        </div>
        <p className="lead">Loading…</p>
      </div>
    );
  }

  const { projection, holdings, totalValue } = data;
  const probPct = projection.probabilityOfSuccess * 100;

  // classifySuccessBand takes a 0–1 ratio (NOT a percentage); the component's
  // probabilityOfSuccess is already in [0, 1], so pass it directly.
  const band = SUCCESS_BAND[classifySuccessBand(projection.probabilityOfSuccess)];

  // Allocation bar — derive slices from current weights
  const allocSlices = holdings.map((h, i) => ({
    key: h.symbol,
    pct: h.currentWeight,
    color: HOLDING_COLORS[i] ?? '#cdd6e4',
    label: h.symbol,
  }));

  // P10/P50/P90 band bar — show relative widths within the P10–P90 range
  const rangeMax = projection.finalBalanceP90;
  const rangeMin = 0;
  const rangeSpan = rangeMax - rangeMin || 1;
  const p10Left = ((projection.finalBalanceP10 - rangeMin) / rangeSpan) * 100;
  const p90Right = ((projection.finalBalanceP90 - rangeMin) / rangeSpan) * 100;
  const p50Pos = ((projection.finalBalanceP50 - rangeMin) / rangeSpan) * 100;

  return (
    <div className="block-pad">
      {/* ── Header ── */}
      <div className="head">
        <div>
          <div className="eyebrow">Read-only · view only</div>
          <h1 className="h1">Markets</h1>
        </div>
        <span className="badge demo">Demo data</span>
      </div>

      {/* ── Hero candlestick + watchlist (D4) ── */}
      {watchSymbols.length > 0 && (
        <>
          <HeroChart symbol={selected} asOfMs={MARKETS_AS_OF_MS} />
          <WatchlistBlock
            symbols={watchSymbols}
            selected={selected}
            onSelect={setSelected}
            asOfMs={MARKETS_AS_OF_MS}
          />
        </>
      )}

      {/* ── FIRE Projection card ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="eyebrow">FIRE projection · P50 median outcome</div>
        <div className="gradnum">
          {formatCurrency(projection.finalBalanceP50, { maximumFractionDigits: 0 })}
        </div>

        {/* P10–P90 range stat row */}
        <div style={{ display: 'flex', gap: 28, marginTop: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>
              P10 (conservative)
            </div>
            <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--ink-soft)' }}>
              {formatCurrency(projection.finalBalanceP10, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>
              P90 (optimistic)
            </div>
            <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--ink-soft)' }}>
              {formatCurrency(projection.finalBalanceP90, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>
              Probability of success
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: band.color,
                }}
              >
                {probPct.toFixed(0)}%
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: `${band.color}22`,
                  color: band.color,
                }}
              >
                {band.label}
              </span>
            </div>
          </div>
        </div>

        {/* P10/P50/P90 horizontal band bar */}
        <div style={{ marginTop: 18, position: 'relative' }}>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: 'rgba(120,130,145,0.16)',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            {/* Shaded P10–P90 band */}
            <div
              style={{
                position: 'absolute',
                left: `${p10Left}%`,
                width: `${p90Right - p10Left}%`,
                top: 0,
                height: '100%',
                background: 'rgba(217,138,43,0.22)',
                borderRadius: 999,
              }}
            />
            {/* P50 marker */}
            <div
              style={{
                position: 'absolute',
                left: `${p50Pos}%`,
                top: -3,
                width: 4,
                height: 16,
                borderRadius: 4,
                background: 'var(--hearth)',
                transform: 'translateX(-50%)',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 5,
              fontSize: 11,
              color: 'var(--ink-faint)',
              fontWeight: 600,
            }}
          >
            <span>P10</span>
            <span style={{ color: 'var(--hearth)', fontWeight: 700 }}>P50</span>
            <span>P90</span>
          </div>
        </div>

        <div className="note" style={{ marginTop: 14 }}>
          {projection.trials.toLocaleString()}-path Monte Carlo projection · display only, not
          advice.
        </div>
      </div>

      {/* ── Holdings table card ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Holdings · current vs target · read-only view
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ color: 'var(--ink-faint)', textAlign: 'left' }}>
                <th style={thStyle}>Symbol</th>
                <th style={thStyle}>Name</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Value</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Current</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Target</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Drift</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => {
                const dc = DRIFT_COLOR[h.driftState];
                const driftSign = h.driftPp > 0 ? '+' : '';
                return (
                  <tr
                    key={h.symbol}
                    style={{
                      borderTop: i > 0 ? '1px solid rgba(120,130,145,0.1)' : undefined,
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--ink)' }}>{h.symbol}</td>
                    <td style={{ ...tdStyle, color: 'var(--ink-soft)', maxWidth: 200 }}>
                      {h.name}
                    </td>
                    <td
                      style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatCurrency(h.marketValue, { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatPercent(h.currentWeight, { maximumFractionDigits: 1 })}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--ink-faint)',
                      }}
                    >
                      {formatPercent(h.targetWeight, { maximumFractionDigits: 1 })}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: dc.bg,
                          color: dc.text,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {driftSign}
                        {h.driftPp.toFixed(1)}pp · {dc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="note" style={{ marginTop: 14 }}>
          Total portfolio value:{' '}
          <strong>{formatCurrency(totalValue, { maximumFractionDigits: 0 })}</strong>
        </div>
      </div>

      {/* ── Allocation bar card ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="eyebrow">Allocation · current weights</div>
        <div className="alloc-bar" style={{ marginTop: 14, height: 16 }}>
          {allocSlices.map((s) => (
            <span
              key={s.key}
              style={{ width: `${s.pct * 100}%`, background: s.color }}
              title={`${s.label} ${(s.pct * 100).toFixed(1)}%`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {allocSlices.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="swatch" style={{ background: HOLDING_COLORS[i] ?? '#cdd6e4' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>
                {s.label} · {(s.pct * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Read the primary source (route-outward, educational — never a verdict) ── */}
      <div className="card" style={{ marginTop: 16, marginBottom: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Read the primary source · {selected}
        </div>
        <p className="note" style={{ marginTop: 0, marginBottom: 12 }}>
          Lar doesn&rsquo;t give a verdict — it routes you to the source so you decide. Educational,
          not advice.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {buildPrimarySourceLinks(selected).map((s) => (
            <a
              key={s.id}
              className="card"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', textDecoration: 'none' }}
            >
              <div style={{ fontWeight: 600 }}>{s.label} →</div>
              <div className="note" style={{ marginTop: 2 }}>
                {s.why}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Bright-line note ── */}
      <div className="note">
        Read-only · aggregated view · no advice, no order placement. Lar never trades.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny style constants (avoids inline object churn)
// ---------------------------------------------------------------------------

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
