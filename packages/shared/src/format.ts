// Locale-aware number formatters. Every numeric value rendered anywhere in the
// app should pass through this module — never hand-roll thousand separators.
// Cached Intl.NumberFormat instances are keyed by their option fingerprint so
// the same formatter object is reused across repeated calls.

const DEFAULT_LOCALE = 'en-IE';
const DEFAULT_CURRENCY = 'EUR';

// ---------------------------------------------------------------------------
// Private cache maps
// ---------------------------------------------------------------------------

/** Cache for precise currency (standard notation). */
const ccyPreciseCache = new Map<string, Intl.NumberFormat>();
/** Cache for compact currency notation (e.g. €1.2M). */
const ccyCompactCache = new Map<string, Intl.NumberFormat>();
/** Cache for percent formatters. */
const pctCache = new Map<string, Intl.NumberFormat>();
/** Cache for compact plain-number formatters. */
const compactCache = new Map<string, Intl.NumberFormat>();
/** Cache for plain number formatters. */
const numberCache = new Map<string, Intl.NumberFormat>();

/** Build a deterministic cache key from a locale and extra discriminators. */
function cacheKey(locale: string, ...rest: string[]): string {
  return [locale, ...rest].join('|');
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Format a number as a locale-aware currency string.
 *
 * Values with |value| < 10 000 use standard (precise) notation; larger values
 * automatically switch to compact notation (e.g. `€1.2M`). Override with the
 * `precise` option.
 *
 * @example
 *   formatCurrency(1234.5)            // "€1,234.50"
 *   formatCurrency(1_500_000)         // "€1.5M"
 *   formatCurrency(99.9, { currency: 'USD', locale: 'en-US' }) // "$99.90"
 */
export function formatCurrency(
  value: number,
  opts: {
    currency?: string;
    locale?: string;
    maximumFractionDigits?: number;
    /** Force precise (standard) or compact notation. Defaults to auto. */
    precise?: boolean;
  } = {},
): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const currency = opts.currency ?? DEFAULT_CURRENCY;
  const precise = opts.precise ?? Math.abs(value) < 10_000;
  const maxFd = opts.maximumFractionDigits ?? 2;
  const cache = precise ? ccyPreciseCache : ccyCompactCache;
  const k = cacheKey(locale, currency, String(maxFd), precise ? 'p' : 'c');
  let fmt = cache.get(k);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: precise ? 'standard' : 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: maxFd,
      // minimumFractionDigits must not exceed maximumFractionDigits
      minimumFractionDigits: precise ? Math.min(2, maxFd) : 0,
    });
    cache.set(k, fmt);
  }
  return fmt.format(value);
}

/**
 * Format a decimal ratio as a percent string.
 *
 * **Input convention:** pass a *ratio* — i.e. `0.25` for 25%, not `25`.
 * `Intl.NumberFormat` with `style: 'percent'` multiplies by 100 internally,
 * so `formatPercent(0.25)` → `"25.00%"` and `formatPercent(0.0123)` → `"1.23%"`.
 *
 * @example
 *   formatPercent(0.25)                         // "25.00%"
 *   formatPercent(-0.034, { signed: true })      // "-3.40%"
 *   formatPercent(0.1, { maximumFractionDigits: 0 }) // "10%"
 */
export function formatPercent(
  ratio: number,
  opts: {
    locale?: string;
    maximumFractionDigits?: number;
    /** Prefix positive values with `+`. Defaults to false. */
    signed?: boolean;
  } = {},
): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const digits = opts.maximumFractionDigits ?? 2;
  const k = cacheKey(locale, String(digits), opts.signed ? 's' : 'u');
  let fmt = pctCache.get(k);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay: opts.signed ? 'exceptZero' : 'auto',
    });
    pctCache.set(k, fmt);
  }
  return fmt.format(ratio);
}

/**
 * Format a large number in compact notation (e.g. `1.2M`, `340K`).
 * Useful for volumes, counts, and any value where full precision is noise.
 *
 * @example
 *   formatCompact(1_200_000)               // "1.2M"
 *   formatCompact(340_000)                 // "340K"
 *   formatCompact(1_500_000, { currency: 'USD', locale: 'en-US' }) // "$1.5M"
 */
export function formatCompact(
  value: number,
  opts: { locale?: string; currency?: string } = {},
): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const currency = opts.currency;
  const k = cacheKey(locale, currency ?? '__none__');
  let fmt = compactCache.get(k);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      ...(currency ? { style: 'currency', currency } : {}),
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
    });
    compactCache.set(k, fmt);
  }
  return fmt.format(value);
}

/**
 * Format a plain number with grouping separators.
 * Suitable for share quantities, integer counts, or any dimensionless number.
 *
 * @example
 *   formatNumber(1234567.89)                           // "1,234,567.89"
 *   formatNumber(1234567.89, { maximumFractionDigits: 0 }) // "1,234,568"
 */
export function formatNumber(
  value: number,
  opts: { locale?: string; maximumFractionDigits?: number } = {},
): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const digits = opts.maximumFractionDigits ?? 2;
  const k = cacheKey(locale, String(digits));
  let fmt = numberCache.get(k);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
    numberCache.set(k, fmt);
  }
  return fmt.format(value);
}

/**
 * Truncate an Ethereum-style hex address: `0xBwqw…1248`.
 * The full address should be accessible via a tooltip / aria-label.
 */
export function truncateAddress(addr: string, head = 4, tail = 4): string {
  if (!addr) return '';
  if (!addr.startsWith('0x') || addr.length <= 2 + head + tail) return addr;
  return `${addr.slice(0, 2 + head)}…${addr.slice(-tail)}`;
}
