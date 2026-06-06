// Pure math for dashboard analytics. No I/O. No Date.now(). Times are passed in.
//
// All functions are pure. No I/O. No Date.now(). Times are passed in.

// ---------------------------------------------------------------------------
// Drift classification (Swedroe 5/25 + Fidelity 5pp)
// ---------------------------------------------------------------------------

export type DriftState = 'in_band' | 'drifting' | 'rebalance_suggested';

/**
 * Classify a position's drift into a 3-state band.
 *
 *   |drift_pp| >= absoluteThreshold (e.g. 5pp)   → rebalance_suggested
 *   |drift_pp| >= 50% of that threshold          → drifting
 *   else                                          → in_band
 *
 * For small allocations (target < smallAllocationCutoff, default 0.20),
 * a relative breach also triggers: |drift / target| >= relativeThreshold
 * forces rebalance_suggested.
 *
 * All thresholds are fractions (0.05 = 5pp absolute, 0.25 = 25% relative).
 */
export function classifyDrift(input: {
  currentWeight: number;
  targetWeight: number;
  absoluteThreshold?: number;
  relativeThreshold?: number;
  smallAllocationCutoff?: number;
}): DriftState {
  const absThresh = input.absoluteThreshold ?? 0.05;
  const relThresh = input.relativeThreshold ?? 0.25;
  const small = input.smallAllocationCutoff ?? 0.2;

  const drift = input.currentWeight - input.targetWeight;
  const absDrift = Math.abs(drift);

  // Absolute breach — flag regardless of allocation size.
  if (absDrift >= absThresh) return 'rebalance_suggested';

  // Relative breach kicks in only for small allocations.
  if (input.targetWeight > 0 && input.targetWeight < small) {
    const relDrift = Math.abs(drift / input.targetWeight);
    if (relDrift >= relThresh) return 'rebalance_suggested';
  }

  if (absDrift >= absThresh * 0.5) return 'drifting';
  return 'in_band';
}

// ---------------------------------------------------------------------------
// P(success) band classification (Fidelity)
// ---------------------------------------------------------------------------

export type SuccessBand =
  | 'on_target' // > 95
  | 'good' // 80 – 95
  | 'fair' // 65 – 80
  | 'needs_attention' // < 65
  | 'unknown'; // input out of range / NaN

/**
 * Map a Monte Carlo probability-of-success to Fidelity's published four-band
 * scale. `probability` is in [0, 1] (NOT a percentage). Inputs outside the
 * range return "unknown" so callers can render a placeholder.
 */
export function classifySuccessBand(probability: number): SuccessBand {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    return 'unknown';
  }
  const p = probability * 100;
  if (p > 95) return 'on_target';
  if (p >= 80) return 'good';
  if (p >= 65) return 'fair';
  return 'needs_attention';
}

// ---------------------------------------------------------------------------
// Modified Dietz money-weighted return
// ---------------------------------------------------------------------------

/**
 * Money-weighted return over a single period [periodStart, periodEnd].
 *
 *   r = (V1 - V0 - sum C_i) / (V0 + sum_i w_i * C_i)
 *
 * with w_i = (t1 - t_i) / (t1 - t0) — the share of the period that cashflow
 * i was working. Positive amounts are deposits; negative are withdrawals.
 *
 * Returns the period return as a fraction (NOT annualised, NOT inflation-
 * adjusted). Use `annualiseReturn` and `realReturn` to convert. Returns
 * null for degenerate inputs (non-positive period span; zero denominator).
 *
 * Cashflows outside [t0, t1] are silently ignored.
 */
export function modifiedDietzReturn(input: {
  startValue: number;
  endValue: number;
  periodStart: Date | string | number;
  periodEnd: Date | string | number;
  cashflows: { date: Date | string | number; amount: number }[];
}): number | null {
  const t0 = toMs(input.periodStart);
  const t1 = toMs(input.periodEnd);
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return null;
  const totalSpan = t1 - t0;

  let cTotal = 0;
  let weighted = 0;
  for (const cf of input.cashflows) {
    const ti = toMs(cf.date);
    if (!Number.isFinite(ti) || ti < t0 || ti > t1) continue;
    cTotal += cf.amount;
    weighted += ((t1 - ti) / totalSpan) * cf.amount;
  }

  const denom = input.startValue + weighted;
  if (denom <= 0) return null;
  return (input.endValue - input.startValue - cTotal) / denom;
}

/** Annualise a period return r over `years` years: (1+r)^(1/years) - 1. */
export function annualiseReturn(periodReturn: number, years: number): number | null {
  if (!Number.isFinite(periodReturn) || !Number.isFinite(years) || years <= 0) {
    return null;
  }
  // If the period return wiped out the principal, the annualised real return
  // floors at -100 %. Avoid taking a power of a non-positive base.
  if (1 + periodReturn <= 0) return -1;
  return Math.pow(1 + periodReturn, 1 / years) - 1;
}

/** Real return given nominal return and inflation rate, both as fractions. */
export function realReturn(nominal: number, inflation: number): number {
  if (!Number.isFinite(nominal) || !Number.isFinite(inflation)) return NaN;
  return (1 + nominal) / (1 + inflation) - 1;
}

/**
 * Guard against the Modified-Dietz pathology where a missing prior-period
 * anchor (`startValue` = 0) combined with cashflows that only cover a tiny
 * fraction of the ending balance produces an absurd "annualised return".
 *
 * Returns `true` when the inputs are usable, `false` when the caller
 * should render a placeholder ("not enough data") instead of a number.
 * Default ratio 0.20: anything below ~20 % coverage with V0=0 is dominated
 * by pre-period accumulation.
 */
export function hasUsableYtdAnchor(input: {
  startValue: number;
  endValue: number;
  cashflowsTotal: number;
  minCoverageRatio?: number;
}): boolean {
  const minRatio = input.minCoverageRatio ?? 0.2;
  if (!Number.isFinite(input.endValue) || input.endValue <= 0) return false;
  if (input.startValue > 0) return true;
  if (!Number.isFinite(input.cashflowsTotal) || input.cashflowsTotal <= 0) return false;
  return input.cashflowsTotal / input.endValue >= minRatio;
}

function toMs(d: Date | string | number): number {
  if (d instanceof Date) return d.getTime();
  if (typeof d === 'number') return d;
  const parsed = new Date(d).getTime();
  return parsed;
}
