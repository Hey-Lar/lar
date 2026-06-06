/**
 * Deterministic synthetic OHLCV generator for the read-only Markets block.
 *
 * BRIGHT-LINE: this is demo data, never real prices. The Markets surface is
 * display-only; no trades are ever placed against these numbers. The whole
 * function is pure (no I/O, no `Date.now()` reads — the caller supplies
 * `asOfMs`) so tests can drive every behavior.
 *
 * Each symbol hashes to a unique seed; a tiny xmur3 + mulberry32 PRNG drives
 * a geometric random walk with mild drift and volatility clustering, giving
 * plausibly-shaped candles that read like equities without referencing any
 * real series. Suitable for sparklines + the hero candlestick chart.
 */

const DAY_SECONDS = 86_400;

export interface Bar {
  /** Unix seconds at session close. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Knobs for `generateBars`. */
export interface GenerateBarsOptions {
  /** Reference point — synthetic bars end at `floor(asOfMs / 1000)`. */
  asOfMs: number;
  /** How many daily bars to emit (default 180). */
  count?: number;
  /** Starting price for the walk (default ≈ stable price per symbol). */
  basePrice?: number;
  /** Daily drift in % (default 0.04 = +0.04 % per day, ~10 %/yr). */
  driftPct?: number;
  /** Baseline daily vol in % (default 1.4). */
  volPct?: number;
}

// ---- PRNG ------------------------------------------------------------------

/**
 * xmur3 string hash → 32-bit seed (public-domain reference impl). Used to
 * derive a stable seed per symbol so the same ticker always renders the same
 * series.
 */
export function xmur3(str: string): () => number {
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

/** mulberry32 uniform [0, 1) PRNG. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Box–Muller standard-normal sample from two uniform draws. */
function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), Number.EPSILON);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ---- Per-symbol parameters ------------------------------------------------

/**
 * Derive a symbol-stable base price in a plausible band so different tickers
 * don't all start at the same number — purely cosmetic.
 */
export function basePriceFor(symbol: string): number {
  const seed = xmur3(`base:${symbol}`)();
  return 20 + (seed % 380); // €20–€400 band
}

// ---- Bar generator --------------------------------------------------------

/**
 * Emit `count` daily candles for `symbol`. Pure: same inputs → same outputs.
 */
export function generateBars(symbol: string, opts: GenerateBarsOptions): Bar[] {
  const count = opts.count ?? 180;
  if (count <= 0) return [];
  const driftPct = opts.driftPct ?? 0.04;
  const volPct = opts.volPct ?? 1.4;
  const basePrice = opts.basePrice ?? basePriceFor(symbol);

  const rand = mulberry32(xmur3(`walk:${symbol}`)());
  const drift = driftPct / 100;
  const vol = volPct / 100;

  // Snap `asOfMs` to a session close at UTC midnight so adjacent calls within
  // the same UTC day produce the same series — critical for the watchlist
  // (which seeds rows on mount) matching the hero chart (which seeds shortly
  // after) without re-running the walk.
  const endSec = Math.floor(opts.asOfMs / 1000 / DAY_SECONDS) * DAY_SECONDS;

  let close = basePrice;
  let volState = vol;
  const bars: Bar[] = new Array(count);

  for (let i = 0; i < count; i++) {
    // Light vol clustering — yesterday's |move| pushes today's vol up a touch.
    const shock = gaussian(rand);
    const ret = drift + volState * shock;
    const open = close;
    const next = Math.max(close * (1 + ret), 0.01);
    const highBase = Math.max(open, next);
    const lowBase = Math.min(open, next);
    // Wick: +/- 30–60 % of the body, scaled by current vol so calm bars
    // get small wicks and rough bars get larger ones.
    const wick = (Math.abs(ret) + vol * 0.3) * close;
    const high = highBase + wick * (0.3 + rand() * 0.3);
    const low = Math.max(lowBase - wick * (0.3 + rand() * 0.3), 0.01);
    const volume = Math.floor(800_000 + rand() * 4_200_000 + Math.abs(shock) * 1_500_000);
    const time = endSec - (count - 1 - i) * DAY_SECONDS;
    bars[i] = { time, open, high, low, close: next, volume };
    close = next;
    volState = vol * (0.85 + 0.4 * Math.abs(shock));
  }

  return bars;
}

/** Pull just the closes — convenient for sparklines. */
export function closesOf(bars: Bar[]): number[] {
  return bars.map((b) => b.close);
}
