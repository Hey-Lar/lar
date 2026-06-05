import type { FinanceSnapshot } from './snapshot';

/**
 * A realistic, deterministic demo snapshot so the Wealth dashboard renders rich
 * out of the box (no Lumina API required). Mirrors the shape the real
 * `/snapshot` emits; `source: 'demo'` lets the UI badge it honestly.
 */
export function demoSnapshot(): FinanceSnapshot {
  return {
    netWorthEur: 42959,
    buckets: { cash: 36222, investments: 11338, property: 22000, liabilities: -26601 },
    // ~3 months of weekly net-worth points, trending up
    history: [
      38120, 38540, 39010, 39280, 39960, 40410, 40880, 41230, 41690, 42050, 42360, 42710, 42959,
    ],
    goals: [
      { label: 'House deposit', progressPct: 29 },
      { label: 'Emergency fund', progressPct: 100 },
    ],
    emergencyFundMonths: 18.6,
    alerts: [
      { severity: 'RED', title: 'Subscriptions over cap', detail: '€342 this month vs €60 budget' },
      { severity: 'AMBER', title: 'Broadband drifted', detail: '€99.94 vs expected €90' },
      { severity: 'GREEN', title: 'Investing 21% of income', detail: 'above your 20% target' },
    ],
    generatedAt: null,
    source: 'demo',
  };
}
