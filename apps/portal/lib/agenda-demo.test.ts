import { describe, expect, it } from 'vitest';
import { currentItem, generateAgenda, nextUpcoming } from './agenda-demo';

// Anchor: 2026-06-06 12:00 local (mid-day, several items already started).
const REF_MS = new Date(2026, 5, 6, 12, 0, 0, 0).getTime();

describe('agenda-demo', () => {
  it('emits a non-empty schedule for the day', () => {
    const items = generateAgenda(REF_MS);
    expect(items.length).toBeGreaterThan(0);
  });

  it('returns the same schedule shape regardless of the time within the same local day', () => {
    const morning = new Date(2026, 5, 6, 7, 30, 0, 0).getTime();
    const evening = new Date(2026, 5, 6, 20, 0, 0, 0).getTime();
    expect(generateAgenda(evening)).toEqual(generateAgenda(morning));
  });

  it('items are sorted by start time and have end > start', () => {
    const items = generateAgenda(REF_MS);
    for (let i = 1; i < items.length; i++) {
      expect((items[i]?.startMs ?? 0) >= (items[i - 1]?.startMs ?? 0)).toBe(true);
    }
    for (const it of items) expect(it.endMs).toBeGreaterThan(it.startMs);
  });

  it('every item carries a known source and a non-empty title', () => {
    const sources = new Set(['Calendar', 'Focus', 'Wealth', 'Health']);
    for (const it of generateAgenda(REF_MS)) {
      expect(sources.has(it.source)).toBe(true);
      expect(it.title.length).toBeGreaterThan(0);
    }
  });

  it('nextUpcoming finds the first start > asOfMs', () => {
    const items = generateAgenda(REF_MS);
    const next = nextUpcoming(items, REF_MS);
    expect(next).not.toBeNull();
    expect(next!.startMs).toBeGreaterThan(REF_MS);
  });

  it('nextUpcoming returns null after the last item', () => {
    const items = generateAgenda(REF_MS);
    const past = items.at(-1)!.endMs + 1;
    expect(nextUpcoming(items, past)).toBeNull();
  });

  it('currentItem returns the running slot mid-block', () => {
    const items = generateAgenda(REF_MS);
    const slot = items[0]!;
    const mid = (slot.startMs + slot.endMs) / 2;
    expect(currentItem(items, mid)?.id).toBe(slot.id);
  });

  it('currentItem is null in a gap between items', () => {
    const items = generateAgenda(REF_MS);
    const slot = items[0]!;
    const next = items[1]!;
    if (next.startMs - slot.endMs > 1) {
      const gap = (slot.endMs + next.startMs) / 2;
      expect(currentItem(items, gap)).toBeNull();
    }
  });
});
