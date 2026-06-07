/**
 * Deterministic, KEYLESS demo health snapshot for the Health block.
 *
 * BRIGHT-LINE: demo / synthetic data only. Read-only display — Lar never
 * writes, syncs, uploads, or sells health data. This module is pure (no
 * Date.now() inside; caller supplies asOfMs) so SSR and CSR produce identical
 * values and tests can drive every code path without a live device or account.
 *
 * Seeding strategy: xmur3 + mulberry32 (same PRNG pair as synthetic-ohlc.ts).
 * Each local calendar day gets a unique seed string "health:YYYY-MM-DD", so
 * values are stable for the whole day yet differ day-to-day.
 */

// ── PRNG (public-domain xmur3 + mulberry32) ──────────────────────────────────

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next(): number {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Return a seeded uniform [0,1) PRNG for the given day-key string. */
function dayRand(key: string): () => number {
  return mulberry32(xmur3(key)());
}

/** Scale a uniform [0,1) draw to [lo, hi]. */
function scale(r: number, lo: number, hi: number): number {
  return lo + r * (hi - lo);
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface HealthRing {
  key: 'move' | 'exercise' | 'stand';
  label: string;
  value: number;
  goal: number;
  unit: string;
  /** clamp(round(value / goal * 100), 0, 100) */
  pct: number;
}

export interface HealthSnapshot {
  /** The local-midnight ms this snapshot was generated for. */
  generatedFor: number;
  rings: HealthRing[];
  steps: { value: number; goal: number; pct: number };
  /** Hours of sleep last night (e.g. 7.2). */
  sleepHours: number;
  /** Resting heart rate in bpm. */
  restingHr: number;
  /** 7 daily move-ring % values, oldest → newest (index 6 = today). */
  trend: number[];
  trendLabel: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Snap ms to the start of the local calendar day (local midnight). */
function startOfLocalDayMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Format a local-midnight ms as "YYYY-MM-DD" for seeding. */
function localDateKey(midnightMs: number): string {
  const d = new Date(midnightMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clampPct(raw: number): number {
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Generate move-ring % for a specific local-midnight ms. */
function movePctForDay(midnightMs: number): number {
  const key = localDateKey(midnightMs);
  const rand = dayRand(`health:${key}`);
  const moveValue = Math.round(scale(rand(), 300, 600));
  const moveGoal = 650;
  return clampPct((moveValue / moveGoal) * 100);
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a deterministic HealthSnapshot for the local day containing
 * `asOfMs`. Same asOfMs (or any ms within the same local day) → identical
 * result. Different local days → different result.
 *
 * Pure: no Date.now() calls. Caller supplies asOfMs.
 */
export function generateHealth(asOfMs: number): HealthSnapshot {
  const midnight = startOfLocalDayMs(asOfMs);
  const dateKey = localDateKey(midnight);
  const rand = dayRand(`health:${dateKey}`);

  // Activity rings
  const moveValue = Math.round(scale(rand(), 300, 600));
  const moveGoal = 650;
  const exerciseValue = Math.round(scale(rand(), 18, 45));
  const exerciseGoal = 30;
  const standValue = Math.round(scale(rand(), 8, 12));
  const standGoal = 12;

  const rings: HealthRing[] = [
    {
      key: 'move',
      label: 'Move',
      value: moveValue,
      goal: moveGoal,
      unit: 'kcal',
      pct: clampPct((moveValue / moveGoal) * 100),
    },
    {
      key: 'exercise',
      label: 'Exercise',
      value: exerciseValue,
      goal: exerciseGoal,
      unit: 'min',
      pct: clampPct((exerciseValue / exerciseGoal) * 100),
    },
    {
      key: 'stand',
      label: 'Stand',
      value: standValue,
      goal: standGoal,
      unit: 'hr',
      pct: clampPct((standValue / standGoal) * 100),
    },
  ];

  // Steps
  const stepsValue = Math.round(scale(rand(), 4_000, 11_000));
  const stepsGoal = 8_000;
  const steps = {
    value: stepsValue,
    goal: stepsGoal,
    pct: clampPct((stepsValue / stepsGoal) * 100),
  };

  // Sleep & resting HR
  const sleepHours = Math.round(scale(rand(), 6.2, 8.4) * 10) / 10;
  const restingHr = Math.round(scale(rand(), 52, 68));

  // 7-day move% trend (oldest → newest; index 6 = today)
  const MS_PER_DAY = 86_400_000;
  const trend: number[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const dayMidnight = startOfLocalDayMs(midnight - offset * MS_PER_DAY);
    trend.push(movePctForDay(dayMidnight));
  }

  return {
    generatedFor: midnight,
    rings,
    steps,
    sleepHours,
    restingHr,
    trend,
    trendLabel: 'Move · 7-day',
  };
}
