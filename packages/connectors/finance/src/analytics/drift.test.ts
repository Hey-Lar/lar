// Tests for analytics/drift.ts. Pure math, no I/O.
// Ported verbatim from invest-bot-personal/scripts/drift.test.ts
// (adapted import path only).

import { describe, it, expect } from 'vitest';

import { computeDrift, renderDriftMarkdown, type HoldingForDrift } from './drift';

const PERFECT: HoldingForDrift[] = [
  { symbol: 'VWCEd_EQ', market_value: 7000, target_weight: 0.7 },
  { symbol: 'IWDAa_EQ', market_value: 2000, target_weight: 0.2 },
  { symbol: 'AGGHa_EQ', market_value: 1000, target_weight: 0.1 },
];

const DRIFTED: HoldingForDrift[] = [
  { symbol: 'VWCEd_EQ', market_value: 6000, target_weight: 0.7 }, // 60% vs 70% target → -10pp
  { symbol: 'IWDAa_EQ', market_value: 2500, target_weight: 0.2 }, // 25% vs 20% target → +5pp
  { symbol: 'AGGHa_EQ', market_value: 1500, target_weight: 0.1 }, // 15% vs 10% target → +5pp
];

describe('computeDrift', () => {
  it('perfectly-balanced portfolio: zero breaches', () => {
    const r = computeDrift(PERFECT, 0, 5);
    expect(r.breaches.length).toBe(0);
    expect(r.total_equity).toBe(10000);
    for (const p of r.all_positions) expect(p.drift_pp).toBe(0);
  });

  it('drifted portfolio at exactly ±5pp band boundary: counts as a breach (>=)', () => {
    const r = computeDrift(DRIFTED, 0, 5);
    // VWCE at -10pp clearly breaches; IWDA and AGGH at exactly +5pp also breach.
    expect(r.breaches.length).toBe(3);
  });

  it('a wider band (10pp) catches only VWCE', () => {
    const r = computeDrift(DRIFTED, 0, 10);
    expect(r.breaches.length).toBe(1);
    expect(r.breaches[0]?.symbol).toBe('VWCEd_EQ');
  });

  it('positions without target_weight are ignored entirely', () => {
    const mixed: HoldingForDrift[] = [
      { symbol: 'VWCEd_EQ', market_value: 7000, target_weight: 0.7 },
      { symbol: 'PARK_EQ', market_value: 3000 /* no target */ },
    ];
    const r = computeDrift(mixed, 0, 5);
    // PARK shouldn't appear in all_positions or breaches.
    expect(r.all_positions.length).toBe(1);
    expect(r.all_positions[0]?.symbol).toBe('VWCEd_EQ');
  });

  it('cash is part of the denominator (drives weights down)', () => {
    // Same positions but a large cash drag — VWCE's weight drops, so drift increases.
    const r = computeDrift(PERFECT, 10000, 5);
    // total_equity = 20000; VWCE current = 7000/20000 = 0.35; target = 0.7;
    // drift = (0.35 - 0.70) * 100 = -35pp → breach.
    const vwce = r.all_positions.find((p) => p.symbol === 'VWCEd_EQ')!;
    expect(vwce.drift_pp).toBe(-35);
    expect(r.breaches.length).toBe(3); // every position is under target due to cash drag
  });

  it('drift_pp sign matches over/under target', () => {
    const r = computeDrift(DRIFTED, 0, 0); // 0 band = report everything
    const vwce = r.all_positions.find((p) => p.symbol === 'VWCEd_EQ')!;
    const iwda = r.all_positions.find((p) => p.symbol === 'IWDAa_EQ')!;
    expect(vwce.drift_pp).toBeLessThan(0); // VWCE is under target — drift should be negative
    expect(iwda.drift_pp).toBeGreaterThan(0); // IWDA is over target — drift should be positive
  });

  it('zero equity does not divide by zero', () => {
    const r = computeDrift([{ symbol: 'X_EQ', market_value: 0, target_weight: 1 }], 0, 5);
    // current_weight = 0/0 → defined as 0
    expect(r.all_positions[0]?.current_weight).toBe(0);
  });
});

// --- renderDriftMarkdown ---------------------------------------------------

describe('renderDriftMarkdown', () => {
  it('clean-portfolio output says "nothing to do"', () => {
    const md = renderDriftMarkdown(computeDrift(PERFECT, 0, 5), 'EUR');
    expect(md).toMatch(/No positions breached/);
    expect(md).not.toMatch(/⚠️/);
  });

  it('breaches surface a table and a recommended action', () => {
    const md = renderDriftMarkdown(computeDrift(DRIFTED, 0, 5), 'EUR');
    expect(md).toMatch(/breached the ±5pp band/);
    expect(md).toMatch(/\| Symbol \| Current \| Target \| Drift \|/);
    expect(md).toMatch(/Recommended action/);
    expect(md).toMatch(/run-next-contribution\.ts/);
  });

  it('pretty-prints _EQ-suffixed tickers (VWCEd_EQ → VWCE)', () => {
    const md = renderDriftMarkdown(computeDrift(DRIFTED, 0, 5), 'EUR');
    expect(md).toMatch(/\| VWCE \|/);
    expect(md).toMatch(/\| IWDA \|/);
    expect(md).toMatch(/\| AGGH \|/);
  });
});
