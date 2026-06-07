import { describe, expect, it } from 'vitest';
import { generateHealth } from './health-demo';

// Anchor: 2026-06-06 noon local — a fixed reference within a known day.
const REF_MS = new Date(2026, 5, 6, 12, 0, 0, 0).getTime();
// A second ms within the same local day (evening).
const SAME_DAY_EVENING = new Date(2026, 5, 6, 21, 45, 0, 0).getTime();
// A ms in the NEXT local day.
const NEXT_DAY_MS = new Date(2026, 5, 7, 9, 0, 0, 0).getTime();

describe('health-demo', () => {
  // ── Determinism ────────────────────────────────────────────────────────────

  it('produces the same snapshot for two timestamps in the same local day (intraday stability)', () => {
    const a = generateHealth(REF_MS);
    const b = generateHealth(SAME_DAY_EVENING);
    expect(a).toEqual(b);
  });

  it('produces a different snapshot for a different local day', () => {
    const today = generateHealth(REF_MS);
    const tomorrow = generateHealth(NEXT_DAY_MS);
    // At minimum the generatedFor timestamp differs; typically all metrics differ too.
    expect(today).not.toEqual(tomorrow);
  });

  it('is idempotent — calling twice with the same ms returns equal objects', () => {
    expect(generateHealth(REF_MS)).toEqual(generateHealth(REF_MS));
  });

  // ── Rings ─────────────────────────────────────────────────────────────────

  it('rings array has exactly 3 entries with keys move/exercise/stand in that order', () => {
    const { rings } = generateHealth(REF_MS);
    expect(rings).toHaveLength(3);
    expect(rings[0]!.key).toBe('move');
    expect(rings[1]!.key).toBe('exercise');
    expect(rings[2]!.key).toBe('stand');
  });

  it('every ring value is ≥ 0 and pct is in 0..100', () => {
    const { rings } = generateHealth(REF_MS);
    for (const ring of rings) {
      expect(ring.value).toBeGreaterThanOrEqual(0);
      expect(ring.pct).toBeGreaterThanOrEqual(0);
      expect(ring.pct).toBeLessThanOrEqual(100);
    }
  });

  it('move ring value is within expected kcal range (300–600)', () => {
    const { rings } = generateHealth(REF_MS);
    const move = rings.find((r) => r.key === 'move')!;
    expect(move.value).toBeGreaterThanOrEqual(300);
    expect(move.value).toBeLessThanOrEqual(600);
    expect(move.goal).toBe(650);
    expect(move.unit).toBe('kcal');
  });

  it('exercise ring value is within expected min range (18–45)', () => {
    const { rings } = generateHealth(REF_MS);
    const ex = rings.find((r) => r.key === 'exercise')!;
    expect(ex.value).toBeGreaterThanOrEqual(18);
    expect(ex.value).toBeLessThanOrEqual(45);
    expect(ex.goal).toBe(30);
    expect(ex.unit).toBe('min');
  });

  it('stand ring value is within expected hr range (8–12)', () => {
    const { rings } = generateHealth(REF_MS);
    const stand = rings.find((r) => r.key === 'stand')!;
    expect(stand.value).toBeGreaterThanOrEqual(8);
    expect(stand.value).toBeLessThanOrEqual(12);
    expect(stand.goal).toBe(12);
    expect(stand.unit).toBe('hr');
  });

  // ── Steps ─────────────────────────────────────────────────────────────────

  it('steps pct is in 0..100', () => {
    const { steps } = generateHealth(REF_MS);
    expect(steps.pct).toBeGreaterThanOrEqual(0);
    expect(steps.pct).toBeLessThanOrEqual(100);
    expect(steps.goal).toBe(8_000);
  });

  it('steps value is within expected range (4,000–11,000)', () => {
    const { steps } = generateHealth(REF_MS);
    expect(steps.value).toBeGreaterThanOrEqual(4_000);
    expect(steps.value).toBeLessThanOrEqual(11_000);
  });

  // ── Sleep & HR ────────────────────────────────────────────────────────────

  it('sleepHours is within sane range (0..14)', () => {
    const { sleepHours } = generateHealth(REF_MS);
    expect(sleepHours).toBeGreaterThan(0);
    expect(sleepHours).toBeLessThanOrEqual(14);
  });

  it('sleepHours falls in the generated range (6.2–8.4)', () => {
    const { sleepHours } = generateHealth(REF_MS);
    expect(sleepHours).toBeGreaterThanOrEqual(6.2);
    expect(sleepHours).toBeLessThanOrEqual(8.4);
  });

  it('restingHr is within sane range (30..120)', () => {
    const { restingHr } = generateHealth(REF_MS);
    expect(restingHr).toBeGreaterThanOrEqual(30);
    expect(restingHr).toBeLessThanOrEqual(120);
  });

  it('restingHr falls in the generated range (52–68 bpm)', () => {
    const { restingHr } = generateHealth(REF_MS);
    expect(restingHr).toBeGreaterThanOrEqual(52);
    expect(restingHr).toBeLessThanOrEqual(68);
  });

  // ── Trend ─────────────────────────────────────────────────────────────────

  it('trend has exactly 7 entries', () => {
    const { trend } = generateHealth(REF_MS);
    expect(trend).toHaveLength(7);
  });

  it('all trend values are finite and in 0..100', () => {
    const { trend } = generateHealth(REF_MS);
    for (const v of trend) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("trend[6] matches today's move ring pct (same per-day seed)", () => {
    const snap = generateHealth(REF_MS);
    const todayMovePct = snap.rings.find((r) => r.key === 'move')!.pct;
    expect(snap.trend[6]).toBe(todayMovePct);
  });

  it('trendLabel is the expected string', () => {
    expect(generateHealth(REF_MS).trendLabel).toBe('Move · 7-day');
  });

  // ── Shape / fields ────────────────────────────────────────────────────────

  it('generatedFor is local midnight (hours=0, min=0, sec=0, ms=0)', () => {
    const { generatedFor } = generateHealth(REF_MS);
    const d = new Date(generatedFor);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });
});
