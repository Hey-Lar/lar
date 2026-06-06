/**
 * Deterministic, KEYLESS demo schedule for the Agenda block.
 *
 * BRIGHT-LINE: read-only / display-only — Lar does not create, edit, or
 * delete calendar events. The agenda surface routes the user OUT to their
 * real calendar app. This module is the seam where a future Google /
 * Outlook MCP swap will plug in; until then it returns a fixed daily
 * schedule so the UI can be developed end-to-end without an account.
 *
 * The module is pure: no `Date.now()` reads. Callers pass `asOfMs` and the
 * generator anchors items to that day's local midnight.
 */

export type AgendaSource = 'Calendar' | 'Focus' | 'Wealth' | 'Health';

export interface AgendaItem {
  id: string;
  /** Unix ms of the item's start. */
  startMs: number;
  /** Unix ms of the item's end. */
  endMs: number;
  title: string;
  source: AgendaSource;
  /** Optional venue / video-call label (display only). */
  location?: string;
}

/** Items relative to local midnight. (h, m) → minutes. */
function hm(h: number, m: number): number {
  return h * 60 + m;
}

interface Slot {
  start: number;
  end: number;
  title: string;
  source: AgendaSource;
  location?: string;
}

const DAILY_SLOTS: Slot[] = [
  { start: hm(8, 30), end: hm(9, 0), title: 'Morning planning', source: 'Focus' },
  {
    start: hm(9, 30),
    end: hm(10, 0),
    title: 'Standup with sam',
    source: 'Calendar',
    location: 'Zoom',
  },
  { start: hm(10, 30), end: hm(12, 0), title: 'Deep work · design review', source: 'Focus' },
  { start: hm(13, 0), end: hm(13, 30), title: 'Walk + lunch', source: 'Health' },
  {
    start: hm(14, 0),
    end: hm(15, 0),
    title: '1:1 with alex',
    source: 'Calendar',
    location: 'Glass room',
  },
  { start: hm(16, 0), end: hm(16, 15), title: 'Review quarterly contribution', source: 'Wealth' },
  { start: hm(17, 30), end: hm(18, 30), title: 'Evening run', source: 'Health' },
];

/** Return today's schedule, anchored to `asOfMs`. Pure. Stable per UTC day. */
export function generateAgenda(asOfMs: number): AgendaItem[] {
  const start = startOfLocalDayMs(asOfMs);
  return DAILY_SLOTS.map((s, i) => ({
    id: `demo-${i}`,
    startMs: start + s.start * 60_000,
    endMs: start + s.end * 60_000,
    title: s.title,
    source: s.source,
    ...(s.location ? { location: s.location } : {}),
  }));
}

/**
 * Snap `ms` to local midnight. We use the system's local timezone so
 * "today" aligns with what the user actually reads on the clock.
 */
function startOfLocalDayMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Find the next upcoming item (start > asOfMs) or null if the day's done. */
export function nextUpcoming(items: AgendaItem[], asOfMs: number): AgendaItem | null {
  for (const it of items) {
    if (it.startMs > asOfMs) return it;
  }
  return null;
}

/** Currently-running item (start ≤ asOfMs < end) or null. */
export function currentItem(items: AgendaItem[], asOfMs: number): AgendaItem | null {
  for (const it of items) {
    if (it.startMs <= asOfMs && asOfMs < it.endMs) return it;
  }
  return null;
}
