/**
 * Finance connector — READ-ONLY aggregation.
 *
 * BRIGHT-LINE (docs/03-governance): this module never moves money and exposes
 * no write path. It only GETs a validated snapshot. In Phase 1 it consumes the
 * existing Lumina `/snapshot` API (the finance pillar we already built); later
 * it swaps to a licensed AISP (GoCardless / TrueLayer / Plaid) behind the same
 * normalized shape, so nothing downstream changes.
 *
 * This file deliberately isolates finance so it can be split into its own
 * tighter-access repo later (docs/07) without a rewrite.
 */

/** Lar's normalized, UI-ready finance shape. The ONLY thing the app consumes. */
export interface FinanceSnapshot {
  netWorthEur: number;
  buckets: {
    cash: number;
    investments: number;
    property: number;
    liabilities: number;
  };
  /** total-net-worth series (oldest → newest), in EUR. */
  history: number[];
  goals: Array<{ label: string; progressPct: number }>;
  emergencyFundMonths: number | null;
  alerts: Array<{ severity: 'RED' | 'AMBER' | 'GREEN'; title: string; detail: string }>;
  generatedAt: string | null;
  source: 'lumina-snapshot' | 'demo';
}

/** One allocation slice for the segmented bar — positive buckets only. */
export interface AllocationSlice {
  key: keyof FinanceSnapshot['buckets'];
  value: number;
  /** share of the positive total, 0..1 */
  pct: number;
}

/** Pure: positive buckets → proportional slices (unit-testable, UI-agnostic). */
export function allocationSlices(buckets: FinanceSnapshot['buckets']): AllocationSlice[] {
  const entries = (
    Object.entries(buckets) as Array<[keyof FinanceSnapshot['buckets'], number]>
  ).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
  return entries.map(([key, value]) => ({ key, value, pct: value / total }));
}

/** The raw Lumina `/snapshot` data shape (only the fields we read). */
export interface RawLuminaSnapshot {
  net_worth?: {
    total?: number;
    totals?: Partial<Record<'cash' | 'investments' | 'property' | 'liabilities', number>>;
  };
  net_worth_history?: Array<{ total_eur?: number }>;
  projections?: {
    goals?: Array<{ label?: string; id?: string; progress_pct?: number }>;
    emergency_fund?: { runway_months?: number };
  };
  alerts?: Array<{ severity?: string; title?: string; detail?: string }>;
  meta?: { generated_at?: string };
}

const SEVERITIES = new Set(['RED', 'AMBER', 'GREEN']);
const toSeverity = (s?: string): 'RED' | 'AMBER' | 'GREEN' =>
  s && SEVERITIES.has(s) ? (s as 'RED' | 'AMBER' | 'GREEN') : 'GREEN';

/** Pure mapping raw → normalized (unit-tested without network). */
export function normalizeSnapshot(raw: RawLuminaSnapshot): FinanceSnapshot {
  const totals = raw.net_worth?.totals ?? {};
  return {
    netWorthEur: raw.net_worth?.total ?? 0,
    buckets: {
      cash: totals.cash ?? 0,
      investments: totals.investments ?? 0,
      property: totals.property ?? 0,
      liabilities: totals.liabilities ?? 0,
    },
    history: (raw.net_worth_history ?? [])
      .map((p) => p?.total_eur)
      .filter((n): n is number => typeof n === 'number'),
    goals: (raw.projections?.goals ?? []).map((g) => ({
      label: g.label ?? g.id ?? 'Goal',
      progressPct: Math.max(0, Math.min(100, g.progress_pct ?? 0)),
    })),
    emergencyFundMonths:
      typeof raw.projections?.emergency_fund?.runway_months === 'number'
        ? raw.projections.emergency_fund.runway_months
        : null,
    alerts: (raw.alerts ?? []).slice(0, 5).map((a) => ({
      severity: toSeverity(a.severity),
      title: a.title ?? 'Alert',
      detail: a.detail ?? '',
    })),
    generatedAt: raw.meta?.generated_at ?? null,
    source: 'lumina-snapshot',
  };
}

/**
 * Fetch + normalize the read-only snapshot from a Lumina API base.
 * GET only — there is intentionally no write counterpart in this module.
 */
export async function fetchFinanceSnapshot(
  apiBase: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FinanceSnapshot> {
  const base = apiBase.replace(/\/+$/, '');
  const res = await fetchImpl(`${base}/snapshot`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`snapshot fetch failed: HTTP ${res.status}`);
  const body = (await res.json()) as { ok?: boolean; data?: RawLuminaSnapshot; error?: string };
  if (!body.ok || !body.data) throw new Error(body.error ?? 'snapshot: no data');
  return normalizeSnapshot(body.data);
}
