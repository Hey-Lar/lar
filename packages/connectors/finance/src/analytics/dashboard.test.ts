// Tests for analytics/dashboard.ts. Pure math, no I/O.
// Ported from invest-bot-personal scripts/dashboard-math.test.ts
// (node:test / assert → Vitest describe/it/expect; imports → ./dashboard).

import { describe, it, expect } from 'vitest';

import {
  classifyDrift,
  classifySuccessBand,
  modifiedDietzReturn,
  annualiseReturn,
  realReturn,
  hasUsableYtdAnchor,
} from './dashboard';

// ---------------------------------------------------------------------------
// classifyDrift — Swedroe 5/25 in 3 states
// ---------------------------------------------------------------------------

describe('classifyDrift', () => {
  it('|drift| < 50% of absolute threshold → in_band', () => {
    // 2.4pp drift on a 5pp threshold → still 'in_band' (under the 2.5pp half-line)
    expect(classifyDrift({ currentWeight: 0.724, targetWeight: 0.7 })).toBe('in_band');
    // Boundary just under the half-line (2.4pp below target).
    expect(classifyDrift({ currentWeight: 0.676, targetWeight: 0.7 })).toBe('in_band');
  });

  it('50%–100% of threshold → drifting', () => {
    // 3pp drift on a 5pp threshold → 'drifting'.
    expect(classifyDrift({ currentWeight: 0.73, targetWeight: 0.7 })).toBe('drifting');
    // Just below the breach (4.9pp).
    expect(classifyDrift({ currentWeight: 0.749, targetWeight: 0.7 })).toBe('drifting');
  });

  it('|drift| ≥ absolute threshold → rebalance_suggested', () => {
    // Exactly 5pp drift on a 5pp threshold → rebalance_suggested.
    expect(classifyDrift({ currentWeight: 0.75, targetWeight: 0.7 })).toBe('rebalance_suggested');
    // Negative direction also breaches.
    expect(classifyDrift({ currentWeight: 0.62, targetWeight: 0.7 })).toBe('rebalance_suggested');
  });

  it('small allocations trigger the 25% relative rule', () => {
    // Target 5% (small), current 4% → 1pp absolute, but 20% relative.
    // 20% < 25% default, so still 'drifting' / 'in_band' — let's check.
    // Actually 1pp absolute is below the 2.5pp half-threshold → in_band absolutely.
    // 20% relative is below 25% → no relative breach. Final: in_band.
    expect(classifyDrift({ currentWeight: 0.04, targetWeight: 0.05 })).toBe('in_band');
    // Same target, current 3.75% → 25% relative drift → rebalance_suggested.
    expect(classifyDrift({ currentWeight: 0.0375, targetWeight: 0.05 })).toBe(
      'rebalance_suggested',
    );
  });

  it('custom thresholds compose', () => {
    // Tighter 3pp absolute band.
    expect(
      classifyDrift({
        currentWeight: 0.73,
        targetWeight: 0.7,
        absoluteThreshold: 0.03,
      }),
    ).toBe('rebalance_suggested');
  });
});

// ---------------------------------------------------------------------------
// classifySuccessBand — Fidelity scale
// ---------------------------------------------------------------------------

describe('classifySuccessBand', () => {
  it('Fidelity thresholds at 95 / 80 / 65', () => {
    expect(classifySuccessBand(0.96)).toBe('on_target');
    expect(classifySuccessBand(0.95)).toBe('good'); // boundary: 95 is 'good'
    expect(classifySuccessBand(0.8)).toBe('good');
    expect(classifySuccessBand(0.799)).toBe('fair');
    expect(classifySuccessBand(0.65)).toBe('fair');
    expect(classifySuccessBand(0.649)).toBe('needs_attention');
    expect(classifySuccessBand(0.0)).toBe('needs_attention');
  });

  it('out-of-range / NaN → unknown', () => {
    expect(classifySuccessBand(NaN)).toBe('unknown');
    expect(classifySuccessBand(-0.01)).toBe('unknown');
    expect(classifySuccessBand(1.01)).toBe('unknown');
    expect(classifySuccessBand(Infinity)).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// modifiedDietzReturn — money-weighted single-period return
// ---------------------------------------------------------------------------

describe('modifiedDietzReturn', () => {
  it('starting at zero with mid-period deposit', () => {
    // V0 = 0; deposit 1000 at the midpoint; V1 = 1100 at period end.
    // weighted = 0.5 * 1000 = 500. Numerator = 1100 - 0 - 1000 = 100.
    // r = 100 / 500 = 0.20 → 20% return over the half-period the money was in.
    const r = modifiedDietzReturn({
      startValue: 0,
      endValue: 1100,
      periodStart: '2026-01-01T00:00:00Z',
      periodEnd: '2027-01-01T00:00:00Z',
      cashflows: [
        { date: '2026-07-02T00:00:00Z', amount: 1000 }, // ~midpoint
      ],
    });
    // Allow tolerance — the cashflow is one day past exact midpoint.
    expect(r).not.toBeNull();
    expect(Math.abs(r! - 0.2)).toBeLessThan(0.005);
  });

  it('no cashflows reduces to simple TWR', () => {
    // V0 = 1000; no flows; V1 = 1100. r = 100 / 1000 = 10%.
    const r = modifiedDietzReturn({
      startValue: 1000,
      endValue: 1100,
      periodStart: '2026-01-01T00:00:00Z',
      periodEnd: '2027-01-01T00:00:00Z',
      cashflows: [],
    });
    expect(r).toBe(0.1);
  });

  it('degenerate inputs return null', () => {
    // End before start.
    expect(
      modifiedDietzReturn({
        startValue: 100,
        endValue: 110,
        periodStart: '2027-01-01T00:00:00Z',
        periodEnd: '2026-01-01T00:00:00Z',
        cashflows: [],
      }),
    ).toBeNull();
    // Zero denominator (no V0, no flows).
    expect(
      modifiedDietzReturn({
        startValue: 0,
        endValue: 100,
        periodStart: '2026-01-01T00:00:00Z',
        periodEnd: '2027-01-01T00:00:00Z',
        cashflows: [],
      }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// annualiseReturn & realReturn
// ---------------------------------------------------------------------------

describe('annualiseReturn', () => {
  it('21% over 2 years → ~10% p.a.', () => {
    // (1.10)^2 = 1.21, so 21% over 2 years annualises to 10%.
    const r = annualiseReturn(0.21, 2);
    expect(r).not.toBeNull();
    expect(Math.abs(r! - 0.1)).toBeLessThan(1e-9);
  });

  it('total loss floors at -100%', () => {
    // 1 + r = 0 → power undefined; we floor at -1.
    expect(annualiseReturn(-1, 5)).toBe(-1);
    expect(annualiseReturn(-1.5, 5)).toBe(-1);
  });

  it('degenerate years returns null', () => {
    expect(annualiseReturn(0.1, 0)).toBeNull();
    expect(annualiseReturn(0.1, -3)).toBeNull();
  });
});

describe('realReturn', () => {
  it('7% nominal at 2% inflation → ~4.9% real', () => {
    const r = realReturn(0.07, 0.02);
    expect(Math.abs(r - 0.04902)).toBeLessThan(1e-4);
  });
});

// ---------------------------------------------------------------------------
// hasUsableYtdAnchor — V0=0 + sparse cashflows guard
// ---------------------------------------------------------------------------

describe('hasUsableYtdAnchor', () => {
  it('V0 > 0 always usable', () => {
    expect(hasUsableYtdAnchor({ startValue: 1000, endValue: 27450, cashflowsTotal: 100 })).toBe(
      true,
    );
  });

  it('V0=0, cashflows ≥ 20% of endValue → usable', () => {
    // €6000 cashflows on a €27450 portfolio = 21.9% → usable.
    expect(hasUsableYtdAnchor({ startValue: 0, endValue: 27450, cashflowsTotal: 6000 })).toBe(true);
  });

  it('the sample-data pathology → NOT usable', () => {
    // V0=0, V1=€27450 (sample equity), YTD cashflows €2500 (5 deposits of €500).
    // 2500/27450 = 9.1% — well below the 20% default.
    expect(hasUsableYtdAnchor({ startValue: 0, endValue: 27450, cashflowsTotal: 2500 })).toBe(
      false,
    );
  });

  it('zero cashflows and zero V0 → not usable', () => {
    expect(hasUsableYtdAnchor({ startValue: 0, endValue: 27450, cashflowsTotal: 0 })).toBe(false);
  });

  it('custom minCoverageRatio composes', () => {
    // 9% coverage; tighten threshold to 5% → usable.
    expect(
      hasUsableYtdAnchor({
        startValue: 0,
        endValue: 27450,
        cashflowsTotal: 2500,
        minCoverageRatio: 0.05,
      }),
    ).toBe(true);
  });

  it('non-positive endValue is never usable', () => {
    expect(hasUsableYtdAnchor({ startValue: 0, endValue: 0, cashflowsTotal: 100 })).toBe(false);
  });
});
