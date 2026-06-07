import { NextResponse } from 'next/server';
import { projectMonteCarlo, computeDrift, classifyDrift } from '@lar/connector-finance';
import { DEMO_HOLDINGS, DEMO_PROJECTION_INPUTS } from '../../../lib/markets-demo';
import { authorize } from '../../../lib/authz';

/**
 * BRIGHT-LINE: Read-only, display-only. No order paths, no trade controls,
 * no mutation. This route returns aggregated analytics computed from a
 * fixed synthetic demo dataset. Lar never trades or moves money.
 *
 * Returns:
 *   { ok, source, projection: MonteCarloResult, holdings: enriched[] }
 */
export async function GET(req: Request) {
  const gate = authorize(req);
  if (!gate.ok) return gate.response;

  // Fixed seed -> deterministic response across server restarts.
  const projection = projectMonteCarlo(DEMO_PROJECTION_INPUTS, { seed: 0xdeadbeef });

  // Compute drift against the demo holdings (cash = 0 extra, it's already in holdings).
  const driftReport = computeDrift(DEMO_HOLDINGS, 0, 5);

  // Enrich each holding with its drift classification and current weight.
  const holdingsBySymbol = new Map(driftReport.all_positions.map((p) => [p.symbol, p]));

  const holdings = DEMO_HOLDINGS.map((h) => {
    const pos = holdingsBySymbol.get(h.symbol);
    const currentWeight = pos?.current_weight ?? h.market_value / driftReport.total_equity;
    const driftPp = pos?.drift_pp ?? 0;
    const driftState = classifyDrift({
      currentWeight,
      targetWeight: h.target_weight,
    });
    return {
      symbol: h.symbol,
      name: h.name,
      marketValue: h.market_value,
      currentWeight,
      targetWeight: h.target_weight,
      driftPp,
      driftState,
    };
  });

  return NextResponse.json({
    ok: true,
    source: 'demo',
    projection,
    holdings,
    totalValue: driftReport.total_equity,
  });
}
