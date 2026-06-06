/**
 * KEYLESS demo dataset for the Markets block.
 *
 * All values are illustrative and synthetic — no real positions, no real keys.
 * The holdings are a four-position model portfolio (global equity ETF + bonds +
 * small-cap tilt + cash buffer) summing to ~€95 000.
 *
 * BRIGHT-LINE: display-only. No order paths. No real account data.
 */

import type { ProjectionInputs } from '@lar/connector-finance';
import type { HoldingForDrift } from '@lar/connector-finance';

// ---------------------------------------------------------------------------
// Holdings demo data
// ---------------------------------------------------------------------------

/** Extended shape used by the Markets block (adds display metadata). */
export interface DemoHolding extends HoldingForDrift {
  /** Display name */
  name: string;
  /** Market value in EUR */
  market_value: number;
  /** Target allocation as a ratio in [0, 1] */
  target_weight: number;
}

/**
 * Synthetic four-position model portfolio.
 * Total market value = €95 000.
 */
export const DEMO_HOLDINGS: DemoHolding[] = [
  {
    symbol: 'VWCE',
    name: 'Vanguard FTSE All-World UCITS ETF',
    market_value: 62_350,
    target_weight: 0.65,
  },
  {
    symbol: 'IWDA',
    name: 'iShares Core MSCI World UCITS ETF',
    market_value: 16_900,
    target_weight: 0.18,
  },
  {
    symbol: 'AGGH',
    name: 'iShares Core Global Aggregate Bond ETF',
    market_value: 9_310,
    target_weight: 0.1,
  },
  {
    symbol: 'CASH',
    name: 'Euro cash buffer',
    market_value: 6_440,
    target_weight: 0.07,
  },
];

/** Total portfolio value (sum of market values). */
export const DEMO_TOTAL_VALUE = DEMO_HOLDINGS.reduce((s, h) => s + h.market_value, 0);

// ---------------------------------------------------------------------------
// FIRE projection inputs
// ---------------------------------------------------------------------------

/**
 * Illustrative FIRE projection inputs — an "on-track" saver persona.
 * Represents a mid-30s saver with a solid balance and contribution rate,
 * targeting a €40 k/yr retirement lifestyle ~30 years out. These values land
 * the Monte Carlo probabilityOfSuccess in a healthy "Good" band (~0.81).
 */
export const DEMO_PROJECTION_INPUTS: ProjectionInputs = {
  currentBalance: 400_000, // €400 k current portfolio value
  monthlyContribution: 3_000, // €3 000/mo ongoing contribution
  yearsToTarget: 30, // ~30-year horizon
  expectedRealReturnPct: 5, // 5 % real return (after inflation)
  inflationPct: 2.5, // 2.5 % annual inflation assumption
  annualSpendingToday: 40_000, // €40 k/yr desired retirement spending (today's money)
  safeWithdrawalRatePct: 4, // 4 % safe withdrawal rate
};
