// Tests for analytics/contribution.ts. Pure math, no I/O.
// Ported verbatim from invest-bot-personal/scripts/next-contribution.test.ts
// (adapted import path only).
//
// NOTE — no-sell bright-line: the source test file already contains a
// dedicated test ("never recommends a sell even when a position is wildly
// above target") that asserts every recommendation amount >= 0 AND that
// the under-weight position receives nearly all the cash. That test is
// ported here verbatim below. An additional explicit bright-line test is
// also added at the bottom to make the property visible in this codebase.

import { describe, it, expect } from 'vitest';

import { recommendNextContribution, type HoldingForRebalance } from './contribution';

// Three-fund Irish portfolio at target weights = current weights (perfectly
// balanced before contribution; cash is 0).
const PERFECT: HoldingForRebalance[] = [
  { symbol: 'VWCEd_EQ', market_value: 7000, target_weight: 0.7 },
  { symbol: 'IWDAa_EQ', market_value: 2000, target_weight: 0.2 },
  { symbol: 'AGGHa_EQ', market_value: 1000, target_weight: 0.1 },
];

// Same three funds but VWCE has drifted down (only 60% instead of 70%).
const DRIFTED: HoldingForRebalance[] = [
  { symbol: 'VWCEd_EQ', market_value: 6000, target_weight: 0.7 },
  { symbol: 'IWDAa_EQ', market_value: 2500, target_weight: 0.2 },
  { symbol: 'AGGHa_EQ', market_value: 1500, target_weight: 0.1 },
];

describe('recommendNextContribution', () => {
  it('perfectly-balanced + €500 contribution splits proportional to target', () => {
    const r = recommendNextContribution({
      holdings: PERFECT,
      cash: 0,
      contribution: 500,
      currency: 'EUR',
    });
    const m = new Map(r.recommendations.map((rec) => [rec.symbol, rec.amount]));
    // No shortfalls (each is already at target), so 100% topup: 70/20/10
    expect(m.get('VWCEd_EQ')).toBe(350);
    expect(m.get('IWDAa_EQ')).toBe(100);
    expect(m.get('AGGHa_EQ')).toBe(50);
    expect(r.totalAllocated).toBe(500);
    expect(r.unallocated).toBe(0);
  });

  it('drifted-down VWCE: contribution goes mostly to closing the shortfall', () => {
    const r = recommendNextContribution({
      holdings: DRIFTED,
      cash: 0,
      contribution: 500,
      currency: 'EUR',
    });
    const vwce = r.recommendations.find((rec) => rec.symbol === 'VWCEd_EQ')!;
    const aggh = r.recommendations.find((rec) => rec.symbol === 'AGGHa_EQ')!;
    // VWCE is below target → should get more than its 70% target share
    expect(vwce.amount).toBeGreaterThan(350);
    // AGGH is above target → should get less (probably 0 if shortfall sum >= contribution)
    expect(aggh.amount).toBeLessThanOrEqual(50);
    expect(r.totalAllocated <= 500 + 0.01).toBe(true);
  });

  it('contribution larger than all shortfalls: residual goes by target weight', () => {
    // Total post-equity = 10_000 + 100_000 = 110_000.
    // Targets: VWCE 77_000, IWDA 22_000, AGGH 11_000.
    // Shortfalls: 77000-7000=70000, 22000-2000=20000, 11000-1000=10000 -> sum 100k.
    // Contribution = 100k matches shortfalls EXACTLY. To exercise the
    // "residual goes by target" path, give 110k. 10k residual at 70/20/10.
    const r = recommendNextContribution({
      holdings: PERFECT,
      cash: 0,
      contribution: 110_000,
      currency: 'EUR',
    });
    // After: VWCE 7000 + (70k + 7k) = 84k, IWDA 2000 + 22k = 24k, AGGH 1000 + 11k = 12k.
    // Total post = 120k. 84/120 = 0.7, 24/120 = 0.2, 12/120 = 0.1.
    const m = new Map(r.recommendations.map((rec) => [rec.symbol, rec.amount]));
    // VWCE shortfall 70k + 70% of 10k residual = 77000
    expect(Math.abs((m.get('VWCEd_EQ') ?? 0) - 77000)).toBeLessThan(1);
    expect(Math.abs((m.get('IWDAa_EQ') ?? 0) - 22000)).toBeLessThan(1);
    expect(Math.abs((m.get('AGGHa_EQ') ?? 0) - 11000)).toBeLessThan(1);
  });

  it('zero contribution returns zero buys but does not crash', () => {
    const r = recommendNextContribution({
      holdings: PERFECT,
      cash: 0,
      contribution: 0,
      currency: 'EUR',
    });
    expect(r.totalAllocated).toBe(0);
    for (const rec of r.recommendations) {
      expect(rec.amount).toBe(0);
      expect(rec.reason).toBe('skipped');
    }
  });

  it('never recommends a sell even when a position is wildly above target', () => {
    // VWCE is 90% of the portfolio but target is 10%. With NO contribution,
    // we'd want to sell. Rebalance-by-contribution never sells: the
    // recommendation here should not include any negative amounts.
    const heavy: HoldingForRebalance[] = [
      { symbol: 'VWCEd_EQ', market_value: 9000, target_weight: 0.1 },
      { symbol: 'IWDAa_EQ', market_value: 1000, target_weight: 0.9 },
    ];
    const r = recommendNextContribution({
      holdings: heavy,
      cash: 0,
      contribution: 200,
      currency: 'EUR',
    });
    for (const rec of r.recommendations) {
      expect(rec.amount, `${rec.symbol} got negative buy ${rec.amount}`).toBeGreaterThanOrEqual(0);
    }
    // IWDA is the only one with a shortfall (heavily under-weight relative
    // to its 90% target), so it should receive ~all the cash.
    const iwda = r.recommendations.find((rec) => rec.symbol === 'IWDAa_EQ')!;
    expect(iwda.amount).toBeGreaterThanOrEqual(199);
  });

  it('untargeted positions are ignored (no target_weight = no recommendation)', () => {
    const mixed: HoldingForRebalance[] = [
      { symbol: 'VWCEd_EQ', market_value: 5000, target_weight: 0.7 },
      { symbol: 'PARK_EQ', market_value: 5000 /* no target */ },
    ];
    const r = recommendNextContribution({
      holdings: mixed,
      cash: 0,
      contribution: 1000,
      currency: 'EUR',
    });
    // Only VWCE should appear in recommendations.
    expect(r.recommendations.length).toBe(1);
    expect(r.recommendations[0]?.symbol).toBe('VWCEd_EQ');
  });

  it('targets that do not sum to 1.0 are normalised, no contribution is stranded', () => {
    // User entered 0.6 / 0.3 (sums to 0.9). Treat as 0.667 / 0.333 of cash.
    const partial: HoldingForRebalance[] = [
      { symbol: 'VWCEd_EQ', market_value: 600, target_weight: 0.6 },
      { symbol: 'IWDAa_EQ', market_value: 300, target_weight: 0.3 },
    ];
    const r = recommendNextContribution({
      holdings: partial,
      cash: 0,
      contribution: 100,
      currency: 'EUR',
    });
    expect(r.totalAllocated).toBeGreaterThanOrEqual(99);
  });

  it('projected_weight reflects what the portfolio looks like AFTER the buys', () => {
    const r = recommendNextContribution({
      holdings: DRIFTED,
      cash: 0,
      contribution: 500,
      currency: 'EUR',
    });
    // Sum of projected weights should be ≈ 1.0
    const sum = r.recommendations.reduce((s, rec) => s + rec.projected_weight, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.01);
  });

  it('existing cash position is treated as part of the denominator', () => {
    // current_equity includes existing cash; the contribution adds to it.
    const r = recommendNextContribution({
      holdings: PERFECT,
      cash: 500,
      contribution: 500,
      currency: 'EUR',
    });
    // post_equity = 10_000 (holdings) + 500 (cash) + 500 (contrib) = 11_000.
    expect(r.postEquity).toBe(11_000);
  });
});

// ---------------------------------------------------------------------------
// Extra bright-line test: over-weight bucket never generates a sell
// (the source "wildly above target" test is the primary assertion; this
// is an additional explicit statement of the property for this codebase)
// ---------------------------------------------------------------------------

describe('no-sell bright-line (contribution.ts)', () => {
  it('over-weight position receives 0 allocation, never a negative amount', () => {
    // CASH is 80% of portfolio but has 0% target — only EQUITY has a target.
    // With any positive contribution, all cash goes to EQUITY; nothing is < 0.
    const holdings: HoldingForRebalance[] = [
      { symbol: 'EQUITY', market_value: 1000, target_weight: 1.0 },
      { symbol: 'OVERWEIGHT', market_value: 8000 /* no target */ },
    ];
    const r = recommendNextContribution({
      holdings,
      cash: 0,
      contribution: 500,
      currency: 'EUR',
    });
    for (const rec of r.recommendations) {
      expect(
        rec.amount,
        `SELL detected: ${rec.symbol} amount=${rec.amount}`,
      ).toBeGreaterThanOrEqual(0);
    }
    // The over-weight untargeted holding does not appear in recommendations at all.
    const overweightRec = r.recommendations.find((rec) => rec.symbol === 'OVERWEIGHT');
    expect(overweightRec).toBeUndefined();
  });
});
