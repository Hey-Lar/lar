/**
 * remember-digest — pure, deterministic synthesis over the Remember Room's items.
 *
 * The seed of HeyLar's "personal-context layer": rather than a flat notes bucket,
 * Remember holds notes + decisions and surfaces a daily digest + a retrospective —
 * computed ON-DEVICE from already-decrypted items. No LLM, no network: a v1 that's
 * private by construction and a clean seam for a future AI synthesis pass.
 *
 * Pure functions only (testable, SSR-safe). The caller passes `nowMs` so output is
 * deterministic. Day bucketing is UTC (stable across machines); a local-day option is
 * a future refinement.
 */

export type ItemKind = 'note' | 'decision';
export type DecisionStatus = 'open' | 'resolved';

export interface RememberItem {
  id: string;
  kind: ItemKind;
  text: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** decisions only: the "why". */
  rationale?: string;
  /** decisions only. */
  status?: DecisionStatus;
}

export interface DayCount {
  /** YYYY-MM-DD (UTC). */
  day: string;
  count: number;
}

export interface Digest {
  total: number;
  notes: number;
  decisions: number;
  openDecisions: number;
  addedToday: number;
  /** ISO of the most recently created item, or null if empty. */
  lastUpdated: string | null;
  /** Per-day counts for the last 7 days (incl. today), oldest → newest. */
  last7Days: DayCount[];
}

const DAY_MS = 86_400_000;

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function itemMs(item: RememberItem): number {
  const ms = Date.parse(item.createdAt);
  return Number.isFinite(ms) ? ms : 0;
}

/** Summarise the Remember items into a deterministic digest as of `nowMs`. */
export function summarizeRemember(items: RememberItem[], nowMs: number): Digest {
  const today = utcDay(nowMs);

  let notes = 0;
  let decisions = 0;
  let openDecisions = 0;
  let addedToday = 0;
  let lastMs = -1;
  let lastUpdated: string | null = null;

  const dayMap = new Map<string, number>();

  for (const it of items) {
    if (it.kind === 'decision') {
      decisions += 1;
      if (it.status !== 'resolved') openDecisions += 1;
    } else {
      notes += 1;
    }

    const ms = itemMs(it);
    const day = utcDay(ms);
    if (day === today) addedToday += 1;
    if (ms > lastMs) {
      lastMs = ms;
      lastUpdated = it.createdAt;
    }
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }

  // Last 7 calendar days (UTC), oldest → newest, zero-filled.
  const last7Days: DayCount[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = utcDay(nowMs - i * DAY_MS);
    last7Days.push({ day, count: dayMap.get(day) ?? 0 });
  }

  return {
    total: items.length,
    notes,
    decisions,
    openDecisions,
    addedToday,
    lastUpdated,
    last7Days,
  };
}

/**
 * Retrospective: the most-recent items (newest first), capped. A deterministic
 * "here's what you've been thinking about" list — the seam where an AI summary slots
 * in later.
 */
export function recentItems(items: RememberItem[], limit = 5): RememberItem[] {
  return [...items].sort((a, b) => itemMs(b) - itemMs(a)).slice(0, Math.max(0, limit));
}
