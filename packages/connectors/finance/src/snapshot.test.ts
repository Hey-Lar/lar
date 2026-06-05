import { describe, it, expect, vi } from 'vitest';
import { normalizeSnapshot, fetchFinanceSnapshot, type RawLuminaSnapshot } from './snapshot';

const raw: RawLuminaSnapshot = {
  net_worth: {
    total: 42959,
    totals: { cash: 36222, investments: 11338, property: 22000, liabilities: -26601 },
  },
  net_worth_history: [{ total_eur: 38000 }, { total_eur: 40000 }, { total_eur: 42959 }],
  projections: {
    goals: [
      { label: 'House deposit', progress_pct: 29 },
      { id: 'ef', progress_pct: 250 },
    ],
    emergency_fund: { runway_months: 18.6 },
  },
  alerts: [{ severity: 'RED', title: 'Subscriptions over cap', detail: '€342 vs €60' }],
  meta: { generated_at: '2026-06-05T10:00:00Z' },
};

describe('normalizeSnapshot', () => {
  it('maps the Lumina shape to Lar finance shape', () => {
    const s = normalizeSnapshot(raw);
    expect(s.netWorthEur).toBe(42959);
    expect(s.buckets.cash).toBe(36222);
    expect(s.buckets.liabilities).toBe(-26601);
    expect(s.history).toEqual([38000, 40000, 42959]);
    expect(s.emergencyFundMonths).toBeCloseTo(18.6);
    expect(s.source).toBe('lumina-snapshot');
  });

  it('clamps goal progress to 0..100 and falls back to id for label', () => {
    const s = normalizeSnapshot(raw);
    expect(s.goals[0]).toEqual({ label: 'House deposit', progressPct: 29 });
    expect(s.goals[1]).toEqual({ label: 'ef', progressPct: 100 });
  });

  it('defaults gracefully on an empty snapshot', () => {
    const s = normalizeSnapshot({});
    expect(s.netWorthEur).toBe(0);
    expect(s.buckets).toEqual({ cash: 0, investments: 0, property: 0, liabilities: 0 });
    expect(s.history).toEqual([]);
    expect(s.emergencyFundMonths).toBeNull();
    expect(s.alerts).toEqual([]);
  });

  it('coerces unknown alert severities to GREEN', () => {
    const s = normalizeSnapshot({ alerts: [{ severity: 'PURPLE', title: 'x' }] });
    expect(s.alerts[0]?.severity).toBe('GREEN');
  });
});

describe('fetchFinanceSnapshot', () => {
  it('GETs /snapshot, unwraps {ok,data}, and normalizes', async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({ ok: true, status: 200, json: async () => ({ ok: true, data: raw }) }) as Response,
    ) as unknown as typeof fetch;
    const s = await fetchFinanceSnapshot('http://localhost:3001/', fetchImpl);
    expect(s.netWorthEur).toBe(42959);
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'http://localhost:3001/snapshot',
    );
  });

  it('throws when the body is not ok', async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({ ok: true, status: 200, json: async () => ({ ok: false, error: 'nope' }) }) as Response,
    ) as unknown as typeof fetch;
    await expect(fetchFinanceSnapshot('http://x', fetchImpl)).rejects.toThrow('nope');
  });
});
