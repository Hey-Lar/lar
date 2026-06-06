import { describe, expect, it } from 'vitest';
import { basePriceFor, closesOf, generateBars, mulberry32, xmur3 } from './synthetic-ohlc';

// A fixed reference instant — anchored to a real UTC midnight (2026-06-06).
const REF_MS = 1_780_704_000_000;

describe('synthetic-ohlc', () => {
  it('xmur3 + mulberry32 are deterministic for the same seed', () => {
    const a = mulberry32(xmur3('hello')());
    const b = mulberry32(xmur3('hello')());
    for (let i = 0; i < 5; i++) expect(a()).toBeCloseTo(b(), 12);
  });

  it('basePriceFor lands in the documented €20–€400 band and is stable per symbol', () => {
    for (const s of ['VWCE', 'IWDA', 'AGGH', 'AAPL']) {
      const p = basePriceFor(s);
      expect(p).toBeGreaterThanOrEqual(20);
      expect(p).toBeLessThanOrEqual(400);
      expect(basePriceFor(s)).toBe(p);
    }
  });

  it('emits the requested number of bars and zero on count<=0', () => {
    expect(generateBars('VWCE', { asOfMs: REF_MS, count: 10 })).toHaveLength(10);
    expect(generateBars('VWCE', { asOfMs: REF_MS, count: 0 })).toHaveLength(0);
    expect(generateBars('VWCE', { asOfMs: REF_MS, count: -3 })).toHaveLength(0);
  });

  it('same symbol + same asOfMs reproduce the exact same series (PURE)', () => {
    const a = generateBars('VWCE', { asOfMs: REF_MS, count: 30 });
    const b = generateBars('VWCE', { asOfMs: REF_MS, count: 30 });
    expect(b).toEqual(a);
  });

  it('different symbols produce different series', () => {
    const a = generateBars('VWCE', { asOfMs: REF_MS, count: 30 });
    const b = generateBars('IWDA', { asOfMs: REF_MS, count: 30 });
    expect(b[0]?.close).not.toBe(a[0]?.close);
  });

  it('every bar satisfies the OHLC invariant: low ≤ open/close ≤ high, all positive', () => {
    const bars = generateBars('VWCE', { asOfMs: REF_MS, count: 60 });
    for (const b of bars) {
      expect(b.low).toBeGreaterThan(0);
      expect(b.high).toBeGreaterThanOrEqual(b.low);
      expect(b.high).toBeGreaterThanOrEqual(b.open);
      expect(b.high).toBeGreaterThanOrEqual(b.close);
      expect(b.low).toBeLessThanOrEqual(b.open);
      expect(b.low).toBeLessThanOrEqual(b.close);
      expect(b.volume).toBeGreaterThan(0);
    }
  });

  it('times are daily and end at the UTC-midnight floor of asOfMs', () => {
    const DAY = 86_400;
    const bars = generateBars('VWCE', { asOfMs: REF_MS, count: 5 });
    const expectedEnd = Math.floor(REF_MS / 1000 / DAY) * DAY;
    expect(bars.at(-1)?.time).toBe(expectedEnd);
    for (let i = 1; i < bars.length; i++) {
      expect((bars[i]?.time ?? 0) - (bars[i - 1]?.time ?? 0)).toBe(DAY);
    }
  });

  it('series is stable across the same UTC day (different ms in the same day → same bars)', () => {
    const DAY = 86_400_000;
    const morning = REF_MS;
    const evening = REF_MS + DAY - 1;
    const a = generateBars('VWCE', { asOfMs: morning, count: 10 });
    const b = generateBars('VWCE', { asOfMs: evening, count: 10 });
    expect(b).toEqual(a);
  });

  it('closesOf returns just the closes, in order', () => {
    const bars = generateBars('VWCE', { asOfMs: REF_MS, count: 4 });
    expect(closesOf(bars)).toEqual(bars.map((b) => b.close));
  });
});
