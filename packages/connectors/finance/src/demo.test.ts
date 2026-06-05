import { describe, it, expect } from 'vitest';
import { demoSnapshot } from './demo';
import { allocationSlices } from './snapshot';

describe('demoSnapshot', () => {
  it('returns a realistic, badge-able demo snapshot', () => {
    const s = demoSnapshot();
    expect(s.source).toBe('demo');
    expect(s.netWorthEur).toBeGreaterThan(0);
    expect(s.history.length).toBeGreaterThanOrEqual(2);
    expect(s.history[s.history.length - 1]).toBe(s.netWorthEur);
    expect(s.alerts).toHaveLength(3);
    expect(s.emergencyFundMonths).toBeGreaterThan(0);
  });
});

describe('allocationSlices', () => {
  it('returns only positive buckets as proportional slices summing to ~1', () => {
    const slices = allocationSlices({
      cash: 36222,
      investments: 11338,
      property: 22000,
      liabilities: -26601,
    });
    expect(slices.map((s) => s.key)).toEqual(['cash', 'investments', 'property']);
    const total = slices.reduce((a, s) => a + s.pct, 0);
    expect(total).toBeCloseTo(1, 5);
    const cash = slices.find((s) => s.key === 'cash');
    expect(cash?.pct).toBeGreaterThan(0.5);
  });

  it('handles all-zero buckets without dividing by zero', () => {
    expect(allocationSlices({ cash: 0, investments: 0, property: 0, liabilities: 0 })).toEqual([]);
  });
});
