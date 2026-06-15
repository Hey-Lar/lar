import { describe, it, expect } from 'vitest';
import {
  summarizeRemember,
  recentItems,
  openCommitments,
  type RememberItem,
} from './remember-digest';

const NOW = Date.parse('2026-06-14T12:00:00Z'); // a fixed "now" (UTC)
const day = (d: string, h = '09:00:00') => `${d}T${h}Z`;

function note(id: string, createdAt: string): RememberItem {
  return { id, kind: 'note', text: id, createdAt };
}
function decision(id: string, createdAt: string, status?: 'open' | 'resolved'): RememberItem {
  return { id, kind: 'decision', text: id, createdAt, status, rationale: 'because' };
}

describe('summarizeRemember', () => {
  it('handles an empty list (zeroed, 7 empty days, null lastUpdated)', () => {
    const d = summarizeRemember([], NOW);
    expect(d).toMatchObject({ total: 0, notes: 0, decisions: 0, openDecisions: 0, addedToday: 0 });
    expect(d.lastUpdated).toBeNull();
    expect(d.last7Days).toHaveLength(7);
    expect(d.last7Days.every((x) => x.count === 0)).toBe(true);
  });

  it('counts notes vs decisions and open decisions (resolved excluded)', () => {
    const items = [
      note('n1', day('2026-06-14')),
      note('n2', day('2026-06-13')),
      decision('d1', day('2026-06-14'), 'open'),
      decision('d2', day('2026-06-12'), 'resolved'),
      decision('d3', day('2026-06-10')), // undefined status counts as open
    ];
    const d = summarizeRemember(items, NOW);
    expect(d.total).toBe(5);
    expect(d.notes).toBe(2);
    expect(d.decisions).toBe(3);
    expect(d.openDecisions).toBe(2); // d1 + d3 (d2 resolved)
  });

  it('counts items added today (UTC day of now)', () => {
    const items = [
      note('today1', day('2026-06-14', '00:01:00')),
      note('today2', day('2026-06-14', '23:59:00')),
      note('yesterday', day('2026-06-13', '23:59:00')),
    ];
    expect(summarizeRemember(items, NOW).addedToday).toBe(2);
  });

  it('reports the most-recent createdAt as lastUpdated', () => {
    const items = [
      note('old', day('2026-06-01')),
      note('newest', day('2026-06-14', '11:00:00')),
      note('mid', day('2026-06-10')),
    ];
    expect(summarizeRemember(items, NOW).lastUpdated).toBe(day('2026-06-14', '11:00:00'));
  });

  it('builds a 7-day window oldest→newest ending today, zero-filled', () => {
    const items = [
      note('a', day('2026-06-14')), // today
      note('b', day('2026-06-14')), // today
      note('c', day('2026-06-12')), // 2 days ago
      note('z', day('2026-05-01')), // outside the window — counted in total, not in days
    ];
    const d = summarizeRemember(items, NOW);
    expect(d.last7Days).toHaveLength(7);
    expect(d.last7Days[0]!.day).toBe('2026-06-08'); // 6 days ago
    expect(d.last7Days[6]!.day).toBe('2026-06-14'); // today
    expect(d.last7Days[6]!.count).toBe(2); // a + b
    expect(d.last7Days[4]!.day).toBe('2026-06-12');
    expect(d.last7Days[4]!.count).toBe(1); // c
    expect(d.total).toBe(4); // z still counted in total
  });

  it('treats a malformed createdAt as epoch 0 without throwing', () => {
    const items = [{ id: 'bad', kind: 'note', text: 'x', createdAt: 'not-a-date' } as RememberItem];
    expect(() => summarizeRemember(items, NOW)).not.toThrow();
    expect(summarizeRemember(items, NOW).total).toBe(1);
  });
});

describe('recentItems', () => {
  it('returns newest-first, capped at the limit', () => {
    const items = [
      note('a', day('2026-06-10')),
      note('b', day('2026-06-14')),
      note('c', day('2026-06-12')),
    ];
    expect(recentItems(items, 2).map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('does not mutate the input array', () => {
    const items = [note('a', day('2026-06-10')), note('b', day('2026-06-14'))];
    const snapshot = items.map((i) => i.id);
    recentItems(items);
    expect(items.map((i) => i.id)).toEqual(snapshot);
  });
});

describe('openCommitments', () => {
  it('returns only unresolved decisions (notes + resolved excluded), oldest first', () => {
    const items = [
      note('n1', day('2026-06-01')), // not a decision
      decision('old-open', day('2026-06-04'), 'open'), // 10 days
      decision('resolved', day('2026-06-02'), 'resolved'), // excluded
      decision('new-open', day('2026-06-13')), // undefined status = open, 1 day
    ];
    const open = openCommitments(items, NOW);
    expect(open.map((c) => c.id)).toEqual(['old-open', 'new-open']); // oldest → newest
    expect(open[0]!.ageDays).toBe(10);
    expect(open[1]!.ageDays).toBe(1);
  });

  it('carries the rationale and never reports a negative age', () => {
    const open = openCommitments([decision('d', day('2026-06-20'), 'open')], NOW); // future date
    expect(open[0]!.rationale).toBe('because');
    expect(open[0]!.ageDays).toBe(0); // clamped, not negative
  });

  it('is empty when nothing is open', () => {
    expect(openCommitments([decision('d', day('2026-06-01'), 'resolved')], NOW)).toEqual([]);
    expect(openCommitments([], NOW)).toEqual([]);
  });
});
