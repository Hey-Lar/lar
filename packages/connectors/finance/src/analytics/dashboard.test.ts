// Tests for analytics/dashboard.ts. Pure math, no I/O.
// No source test existed; this is the minimal test added per porting spec.

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
// classifyDrift
// ---------------------------------------------------------------------------

describe('classifyDrift', () => {
  it('returns in_band when drift is small', () => {
    expect(classifyDrift({ currentWeight: 0.7, targetWeight: 0.7 })).toBe('in_band');
    expect(classifyDrift({ currentWeight: 0.71, targetWeight: 0.7 })).toBe('in_band');
  });

  it('returns drifting when drift is between 50% and 100% of the absolute threshold', () => {
    // 2.6pp drift with default 5pp threshold: 2.6 >= 2.5 → drifting
    expect(classifyDrift({ currentWeight: 0.726, targetWeight: 0.7 })).toBe('drifting');
  });

  it('returns rebalance_suggested when drift >= absolute threshold', () => {
    // +6pp drift: 0.76 - 0.70 = 0.06 >= 0.05 → rebalance_suggested
    expect(classifyDrift({ currentWeight: 0.76, targetWeight: 0.7 })).toBe('rebalance_suggested');
    // -6pp drift: 0.64 - 0.70 = -0.06, |drift| >= 0.05 → rebalance_suggested
    expect(classifyDrift({ currentWeight: 0.64, targetWeight: 0.7 })).toBe('rebalance_suggested');
  });

  it('applies relative threshold for small allocations', () => {
    // target = 0.08 (< 0.20 cutoff); drift = 0.03; relative = 0.03/0.08 = 0.375 >= 0.25
    expect(classifyDrift({ currentWeight: 0.11, targetWeight: 0.08 })).toBe('rebalance_suggested');
  });

  it('ignores relative threshold for large allocations (absolute threshold still applies)', () => {
    // target = 0.50 (>= 0.20 cutoff); drift = 0.501 - 0.50 = 0.001 < half threshold
    // relative = 0.001/0.50 = 0.002 < 0.25 — well within band
    expect(classifyDrift({ currentWeight: 0.501, targetWeight: 0.5 })).toBe('in_band');
    // And 3.5pp drift (within absolute threshold but above 50%) → drifting, not rebalance_suggested
    expect(classifyDrift({ currentWeight: 0.535, targetWeight: 0.5 })).toBe('drifting');
  });
});

// ---------------------------------------------------------------------------
// classifySuccessBand
// ---------------------------------------------------------------------------

describe('classifySuccessBand', () => {
  it('maps probability ranges to the correct bands', () => {
    expect(classifySuccessBand(0.98)).toBe('on_target');
    expect(classifySuccessBand(0.95)).toBe('good'); // exactly 95 → not > 95 → good
    expect(classifySuccessBand(0.87)).toBe('good');
    expect(classifySuccessBand(0.7)).toBe('fair');
    expect(classifySuccessBand(0.65)).toBe('fair');
    expect(classifySuccessBand(0.5)).toBe('needs_attention');
  });

  it('returns unknown for out-of-range or non-finite inputs', () => {
    expect(classifySuccessBand(NaN)).toBe('unknown');
    expect(classifySuccessBand(-0.1)).toBe('unknown');
    expect(classifySuccessBand(1.1)).toBe('unknown');
    expect(classifySuccessBand(Infinity)).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// modifiedDietzReturn
// ---------------------------------------------------------------------------

describe('modifiedDietzReturn', () => {
  it('returns null for a zero-span period', () => {
    expect(
      modifiedDietzReturn({
        startValue: 100,
        endValue: 110,
        periodStart: 0,
        periodEnd: 0,
        cashflows: [],
      }),
    ).toBeNull();
  });

  it('computes a simple no-cashflow return correctly', () => {
    // V0=100, V1=110, no cashflows → r = (110-100)/100 = 0.10
    const r = modifiedDietzReturn({
      startValue: 100,
      endValue: 110,
      periodStart: 0,
      periodEnd: 1_000_000,
      cashflows: [],
    });
    expect(r).toBeCloseTo(0.1, 5);
  });

  it('accounts for a mid-period deposit', () => {
    // V0=1000, V1=1150, deposit of 100 at the midpoint (w=0.5)
    // denom = 1000 + 0.5*100 = 1050; r = (1150-1000-100)/1050 ≈ 0.0476
    const t0 = 0;
    const t1 = 1_000_000;
    const mid = 500_000;
    const r = modifiedDietzReturn({
      startValue: 1000,
      endValue: 1150,
      periodStart: t0,
      periodEnd: t1,
      cashflows: [{ date: mid, amount: 100 }],
    });
    expect(r).toBeCloseTo(50 / 1050, 5);
  });
});

// ---------------------------------------------------------------------------
// annualiseReturn
// ---------------------------------------------------------------------------

describe('annualiseReturn', () => {
  it('annualises a 10% 2-year return correctly', () => {
    // (1.10)^(1/2) - 1 ≈ 0.04881
    const r = annualiseReturn(0.1, 2);
    expect(r).toBeCloseTo(Math.pow(1.1, 0.5) - 1, 6);
  });

  it('returns null for non-positive years', () => {
    expect(annualiseReturn(0.05, 0)).toBeNull();
    expect(annualiseReturn(0.05, -1)).toBeNull();
  });

  it('returns -1 for a total-loss period return', () => {
    expect(annualiseReturn(-1, 3)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// realReturn
// ---------------------------------------------------------------------------

describe('realReturn', () => {
  it('strips inflation from a nominal return', () => {
    // nominal=0.07, inflation=0.02 → real = (1.07/1.02)-1 ≈ 0.049
    expect(realReturn(0.07, 0.02)).toBeCloseTo(1.07 / 1.02 - 1, 6);
  });

  it('returns NaN for non-finite inputs', () => {
    expect(realReturn(NaN, 0.02)).toBeNaN();
    expect(realReturn(0.05, Infinity)).toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// hasUsableYtdAnchor
// ---------------------------------------------------------------------------

describe('hasUsableYtdAnchor', () => {
  it('returns true when startValue > 0', () => {
    expect(hasUsableYtdAnchor({ startValue: 1000, endValue: 1100, cashflowsTotal: 0 })).toBe(true);
  });

  it('returns true when cashflows cover >= 20% of endValue (and V0=0)', () => {
    expect(hasUsableYtdAnchor({ startValue: 0, endValue: 10_000, cashflowsTotal: 2_000 })).toBe(
      true,
    );
  });

  it('returns false when cashflows cover < 20% of endValue (and V0=0)', () => {
    expect(hasUsableYtdAnchor({ startValue: 0, endValue: 10_000, cashflowsTotal: 1_000 })).toBe(
      false,
    );
  });

  it('returns false for non-positive endValue', () => {
    expect(hasUsableYtdAnchor({ startValue: 0, endValue: 0, cashflowsTotal: 5_000 })).toBe(false);
  });
});
