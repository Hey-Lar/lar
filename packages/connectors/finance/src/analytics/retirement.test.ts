// Tests for analytics/retirement.ts. Pure math, no I/O.
// Ported verbatim from invest-bot-personal/scripts/retirement-projection.test.ts
// (adapted import path only).

import { describe, it, expect } from 'vitest';

import {
  makeSeededRand,
  project,
  projectDeterministic,
  projectMonteCarlo,
  type ProjectionInputs,
} from './retirement';

const BASE: ProjectionInputs = {
  currentBalance: 27_450,
  monthlyContribution: 500,
  yearsToTarget: 24,
  expectedRealReturnPct: 5,
  inflationPct: 2,
  annualSpendingToday: 35_000,
  safeWithdrawalRatePct: 4,
};

// ---------------------------------------------------------------------------
// Deterministic projection
// ---------------------------------------------------------------------------

describe('projectDeterministic', () => {
  it('zero years returns inputs unchanged', () => {
    const r = projectDeterministic({ ...BASE, yearsToTarget: 0 });
    expect(r.finalBalance).toBe(BASE.currentBalance);
    // 35000 today / 0.04 = 875_000 target (no inflation when n=0)
    expect(r.safeWithdrawalTarget).toBe(875_000);
    expect(r.onTrack).toBe(false);
  });

  it('zero contributions = simple compound interest', () => {
    const r = projectDeterministic({
      ...BASE,
      monthlyContribution: 0,
      yearsToTarget: 10,
      expectedRealReturnPct: 5,
    });
    // 27450 * 1.05^10 ≈ 44_716.91
    expect(Math.abs(r.finalBalance - 27450 * Math.pow(1.05, 10))).toBeLessThan(0.5);
  });

  it('zero return + zero years = currentBalance', () => {
    const r = projectDeterministic({
      ...BASE,
      expectedRealReturnPct: 0,
      yearsToTarget: 0,
      monthlyContribution: 0,
    });
    expect(r.finalBalance).toBe(BASE.currentBalance);
  });

  it('zero return + N years of contributions = currentBalance + monthly*12*N', () => {
    const r = projectDeterministic({
      ...BASE,
      expectedRealReturnPct: 0,
      yearsToTarget: 5,
      monthlyContribution: 500,
    });
    // FV with r=0 should collapse to simple sum: current + contributions * months
    const expected = BASE.currentBalance + 500 * 12 * 5;
    expect(r.finalBalance).toBe(expected);
  });

  it('surplus + onTrack flag flip at the boundary', () => {
    // Construct a case where finalBalance ≈ safeWithdrawalTarget.
    const aheadCase = projectDeterministic({
      ...BASE,
      currentBalance: 1_000_000,
      monthlyContribution: 2000,
    });
    expect(aheadCase.onTrack).toBe(true);
    expect(aheadCase.surplusOrShortfall).toBeGreaterThan(0);

    const behindCase = projectDeterministic({
      ...BASE,
      currentBalance: 1_000,
      monthlyContribution: 50,
    });
    expect(behindCase.onTrack).toBe(false);
    expect(behindCase.surplusOrShortfall).toBeLessThan(0);
  });

  it('inflation moves the target up over time', () => {
    const low = projectDeterministic({ ...BASE, yearsToTarget: 1 });
    const high = projectDeterministic({ ...BASE, yearsToTarget: 30 });
    expect(high.safeWithdrawalTarget).toBeGreaterThan(low.safeWithdrawalTarget);
  });
});

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------

describe('projectMonteCarlo', () => {
  it('P10 < P50 < P90 (distribution is non-degenerate)', () => {
    const mc = projectMonteCarlo(BASE, { trials: 500, seed: 42 });
    expect(mc.finalBalanceP10).toBeLessThan(mc.finalBalanceP50);
    expect(mc.finalBalanceP50).toBeLessThan(mc.finalBalanceP90);
  });

  it('zero stdev collapses to a single point (P10≈P50≈P90)', () => {
    const mc = projectMonteCarlo(BASE, { trials: 500, stdevPct: 0, seed: 42 });
    expect(mc.finalBalanceP10).toBe(mc.finalBalanceP50);
    expect(mc.finalBalanceP50).toBe(mc.finalBalanceP90);
  });

  it('probabilityOfSuccess in [0, 1]', () => {
    const mc = projectMonteCarlo(BASE, { trials: 500, seed: 42 });
    expect(mc.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
    expect(mc.probabilityOfSuccess).toBeLessThanOrEqual(1);
  });

  it('seed is reproducible', () => {
    const a = projectMonteCarlo(BASE, { trials: 200, seed: 7 });
    const b = projectMonteCarlo(BASE, { trials: 200, seed: 7 });
    expect(a).toEqual(b);
  });

  it('different seeds give different distributions', () => {
    const a = projectMonteCarlo(BASE, { trials: 200, seed: 1 });
    const b = projectMonteCarlo(BASE, { trials: 200, seed: 999 });
    // Allow they happen to be equal by chance? Vanishingly unlikely with 200
    // trials of stochastic returns — assert any of the three percentiles differ.
    const sameAll =
      a.finalBalanceP10 === b.finalBalanceP10 &&
      a.finalBalanceP50 === b.finalBalanceP50 &&
      a.finalBalanceP90 === b.finalBalanceP90;
    expect(sameAll).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

describe('makeSeededRand', () => {
  it('returns values in [0, 1) and is deterministic per seed', () => {
    const r1 = makeSeededRand(123);
    const r2 = makeSeededRand(123);
    for (let i = 0; i < 5; i++) {
      const a = r1();
      const b = r2();
      expect(a).toBe(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Composed result
// ---------------------------------------------------------------------------

describe('project()', () => {
  it('returns inputs, deterministic, MC and an ISO timestamp', () => {
    const r = project(BASE, { seed: 42 });
    expect(r.inputs).toEqual(BASE);
    expect(r.deterministic.finalBalance).toBeGreaterThan(0);
    expect(r.monteCarlo.trials).toBeGreaterThan(0);
    expect(r.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
