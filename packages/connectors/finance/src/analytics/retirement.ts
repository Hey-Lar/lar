// Pure retirement-projection math, no I/O, no deps.
//
// Two complementary projections:
//
//   1. Deterministic compounding (`projectDeterministic`):
//      future_value = (current * (1 + r)^n) + (monthly * 12 * ((1+r)^n - 1) / r)
//      with `r` = expected real return per year, `n` = years.
//      Cheap, intuitive, the "happy-path" line.
//
//   2. Monte Carlo (`projectMonteCarlo`):
//      1000 trials drawing yearly returns from N(mean, stdev). Reports
//      P10 / P50 / P90 of the terminal balance, plus the probability that
//      the terminal balance >= the safe-withdrawal target.
//      Catches sequence-of-returns risk that the deterministic line hides.
//
// At target retirement age the safe-withdrawal target is computed as:
//   spending_at_retirement / safe_withdrawal_rate
// where spending_at_retirement = annual_spending_today * (1+inflation)^n
// (so the user's "today money" target becomes a nominal-money goal).

export interface ProjectionInputs {
  currentBalance: number; // current portfolio equity (account currency)
  monthlyContribution: number; // contribution per month (today's money)
  yearsToTarget: number; // float OK; e.g. 24.5
  expectedRealReturnPct: number; // 5 means 5%
  inflationPct: number; // 2 means 2%
  annualSpendingToday: number; // today's-money desired retirement spend
  safeWithdrawalRatePct: number; // 4 means 4%
}

export interface DeterministicResult {
  finalBalance: number; // nominal at target year
  safeWithdrawalTarget: number; // nominal at target year
  surplusOrShortfall: number; // finalBalance - target; +ve = ahead
  successRatio: number; // finalBalance / target; 1.0 = bang on
  onTrack: boolean; // successRatio >= 1.0
}

export interface MonteCarloResult {
  trials: number;
  finalBalanceP10: number;
  finalBalanceP50: number;
  finalBalanceP90: number;
  probabilityOfSuccess: number; // share of trials with finalBalance >= target
}

export interface ProjectionResult {
  inputs: ProjectionInputs;
  deterministic: DeterministicResult;
  monteCarlo: MonteCarloResult;
  generatedAt: string; // ISO
}

const ANNUAL_REAL_RETURN_STDEV_PCT = 15; // ~ historical equity std dev (real)

export function projectDeterministic(i: ProjectionInputs): DeterministicResult {
  const r = i.expectedRealReturnPct / 100;
  const n = Math.max(0, i.yearsToTarget);
  // Future value of current balance at constant real return.
  const fvCurrent = i.currentBalance * Math.pow(1 + r, n);
  // Future value of an annuity (monthly contributions, annualised).
  // FV of monthly annuity = c * (((1+rm)^N - 1) / rm), where rm = r/12, N = n*12.
  const rm = r / 12;
  const N = n * 12;
  const fvContrib =
    rm === 0 ? i.monthlyContribution * N : (i.monthlyContribution * (Math.pow(1 + rm, N) - 1)) / rm;
  const finalBalance = fvCurrent + fvContrib;

  // Inflate the user's "today money" spending target out to the target year.
  const spendingAtRetirement = i.annualSpendingToday * Math.pow(1 + i.inflationPct / 100, n);
  const safeWithdrawalTarget = spendingAtRetirement / (i.safeWithdrawalRatePct / 100);

  return {
    finalBalance: round2(finalBalance),
    safeWithdrawalTarget: round2(safeWithdrawalTarget),
    surplusOrShortfall: round2(finalBalance - safeWithdrawalTarget),
    successRatio: +(finalBalance / safeWithdrawalTarget).toFixed(4),
    onTrack: finalBalance >= safeWithdrawalTarget,
  };
}

/**
 * Box-Muller transform. Returns a standard-normal sample using a stable PRNG
 * passed in as `rand` (so tests can be deterministic with a seeded generator).
 */
function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Deterministic 32-bit Mulberry-style PRNG. Seedable so the Monte Carlo
 * output is reproducible across runs (and tests).
 */
export function makeSeededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function projectMonteCarlo(
  i: ProjectionInputs,
  opts: { trials?: number; stdevPct?: number; seed?: number } = {},
): MonteCarloResult {
  const trials = opts.trials ?? 1000;
  const stdev = (opts.stdevPct ?? ANNUAL_REAL_RETURN_STDEV_PCT) / 100;
  const meanR = i.expectedRealReturnPct / 100;
  const n = Math.max(0, Math.round(i.yearsToTarget));
  const seed = opts.seed ?? 0x9e3779b9;
  const rand = makeSeededRand(seed);
  const target = projectDeterministic(i).safeWithdrawalTarget;

  const finals: number[] = [];
  let successes = 0;

  for (let t = 0; t < trials; t++) {
    let balance = i.currentBalance;
    for (let y = 0; y < n; y++) {
      // Draw a yearly return from N(meanR, stdev). Clip to a sane range so
      // an extreme tail doesn't blow up future iterations.
      const r = clamp(meanR + stdev * gaussian(rand), -0.6, 1.5);
      const fv = balance * (1 + r);
      // Add a full year of contributions, smoothed (no within-year compounding).
      balance = fv + i.monthlyContribution * 12;
    }
    finals.push(balance);
    if (balance >= target) successes++;
  }
  finals.sort((a, b) => a - b);
  return {
    trials,
    finalBalanceP10: round2(percentile(finals, 0.1)),
    finalBalanceP50: round2(percentile(finals, 0.5)),
    finalBalanceP90: round2(percentile(finals, 0.9)),
    probabilityOfSuccess: +(successes / trials).toFixed(4),
  };
}

export function project(i: ProjectionInputs, opts?: { seed?: number }): ProjectionResult {
  return {
    inputs: i,
    deterministic: projectDeterministic(i),
    monteCarlo: projectMonteCarlo(i, opts),
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(p * sortedAsc.length));
  return sortedAsc[idx]!;
}
