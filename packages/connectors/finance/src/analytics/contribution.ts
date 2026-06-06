// Pure-math rebalance-by-contribution recommender. No I/O.
//
// Given the user's current holdings + their target weights + the cash they're
// about to deposit, compute how to spread that cash across instruments so
// that the post-contribution weights are as close as possible to target —
// **without selling**. This is the bedrock long-term rebalancing rule
// ("never sell to rebalance; use new money instead") encoded as math.
//
// Algorithm:
//   1. Total post-contribution equity = current_equity + cash.
//   2. For each instrument with a target_weight, compute the target *value*:
//        target_value_i = target_weight_i * total_post_equity
//   3. shortfall_i = max(0, target_value_i - current_market_value_i)
//   4. If sum(shortfall) >= cash: allocate proportional to shortfall_i.
//      (Cash is too small to make every position whole; bring everyone up
//       toward target proportionally.)
//      If sum(shortfall) <  cash: fill each shortfall fully, then allocate
//        the residual proportional to target_weight_i (so the surplus stays
//        on-target).
//
// Sells are never recommended. Positions without a target_weight are
// untouched (you can park cash there manually if you really want).

export interface HoldingForRebalance {
  symbol: string;
  market_value: number;
  target_weight?: number;
}

export interface NextContributionInput {
  holdings: HoldingForRebalance[];
  cash: number; // ALREADY in the account but unallocated (existing cash position)
  contribution: number; // NEW cash about to be deposited (this is what we split)
  currency: string;
}

export interface BuyRecommendation {
  symbol: string;
  amount: number; // in currency units
  reason: 'shortfall' | 'topup' | 'skipped';
  target_weight: number;
  current_weight: number; // before the contribution
  projected_weight: number; // after the contribution lands
}

export interface NextContributionResult {
  inputs: NextContributionInput;
  recommendations: BuyRecommendation[];
  totalAllocated: number; // sum of buys; should == contribution
  unallocated: number; // contribution - totalAllocated (rounding only)
  postEquity: number;
}

const EPS = 0.005; // half-cent

export function recommendNextContribution(i: NextContributionInput): NextContributionResult {
  const currentEquity = i.holdings.reduce((s, h) => s + h.market_value, 0) + i.cash;
  const postEquity = currentEquity + i.contribution;

  // Filter to targeted positions; untargeted positions stay where they are.
  const targeted = i.holdings.filter((h) => h.target_weight !== undefined && h.target_weight > 0);

  // Validate that targets sum to (roughly) 1.0; if not, normalise — we don't
  // want a 0.6-only spec to leave 40% of the contribution stranded.
  const targetSum = targeted.reduce((s, h) => s + (h.target_weight ?? 0), 0);
  if (targetSum <= 0) {
    return {
      inputs: i,
      recommendations: [],
      totalAllocated: 0,
      unallocated: i.contribution,
      postEquity,
    };
  }
  const normTarget = (w: number) => w / targetSum;

  // Step 1: shortfalls
  const shortfalls = new Map<string, number>();
  let shortfallSum = 0;
  for (const h of targeted) {
    const tv = normTarget(h.target_weight!) * postEquity;
    const sf = Math.max(0, tv - h.market_value);
    shortfalls.set(h.symbol, sf);
    shortfallSum += sf;
  }

  const buys = new Map<string, { amount: number; reason: BuyRecommendation['reason'] }>();
  for (const h of targeted) buys.set(h.symbol, { amount: 0, reason: 'skipped' });

  if (i.contribution <= EPS) {
    return packageResult(i, targeted, buys, postEquity);
  }

  if (shortfallSum >= i.contribution) {
    // Spread proportionally to shortfall — keep everyone aligned with their
    // distance from target.
    for (const h of targeted) {
      const sf = shortfalls.get(h.symbol) ?? 0;
      if (sf <= 0) continue;
      const amt = i.contribution * (sf / shortfallSum);
      buys.set(h.symbol, { amount: round2(amt), reason: 'shortfall' });
    }
  } else {
    // Fill every shortfall, then allocate the residual proportional to target.
    let remaining = i.contribution;
    for (const h of targeted) {
      const sf = shortfalls.get(h.symbol) ?? 0;
      if (sf > 0) {
        const amt = Math.min(sf, remaining);
        buys.set(h.symbol, { amount: round2(amt), reason: 'shortfall' });
        remaining -= amt;
      }
    }
    if (remaining > EPS) {
      for (const h of targeted) {
        const prev = buys.get(h.symbol)!;
        const add = remaining * normTarget(h.target_weight!);
        buys.set(h.symbol, {
          amount: round2(prev.amount + add),
          reason: prev.amount > 0 ? 'shortfall' : 'topup',
        });
      }
    }
  }

  return packageResult(i, targeted, buys, postEquity);
}

function packageResult(
  i: NextContributionInput,
  targeted: HoldingForRebalance[],
  buys: Map<string, { amount: number; reason: BuyRecommendation['reason'] }>,
  postEquity: number,
): NextContributionResult {
  const denomBefore = i.holdings.reduce((s, h) => s + h.market_value, 0) + i.cash;
  const recommendations: BuyRecommendation[] = targeted.map((h) => {
    const buy = buys.get(h.symbol) ?? { amount: 0, reason: 'skipped' as const };
    const currentWeight = denomBefore > 0 ? h.market_value / denomBefore : 0;
    const projectedValue = h.market_value + buy.amount;
    const projectedWeight = postEquity > 0 ? projectedValue / postEquity : 0;
    return {
      symbol: h.symbol,
      amount: buy.amount,
      reason: buy.amount > 0 ? buy.reason : 'skipped',
      target_weight: h.target_weight ?? 0,
      current_weight: +currentWeight.toFixed(4),
      projected_weight: +projectedWeight.toFixed(4),
    };
  });
  const totalAllocated = round2(recommendations.reduce((s, r) => s + r.amount, 0));
  return {
    inputs: i,
    recommendations,
    totalAllocated,
    unallocated: round2(i.contribution - totalAllocated),
    postEquity: round2(postEquity),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
