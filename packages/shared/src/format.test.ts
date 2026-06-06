import { describe, expect, it } from 'vitest';
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  formatPercent,
  truncateAddress,
} from './format';

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
  it('formats EUR by default (precise path for small values)', () => {
    const result = formatCurrency(1234.5);
    // Should contain the digits and the euro symbol in some form
    expect(result).toContain('1,234');
    expect(result).toContain('50');
    // Currency symbol for EUR
    expect(result).toMatch(/€|EUR/);
  });

  it('formats small USD value', () => {
    const result = formatCurrency(99.9, { currency: 'USD', locale: 'en-US' });
    expect(result).toContain('99');
    expect(result).toMatch(/\$|USD/);
  });

  it('uses compact notation for large values', () => {
    const result = formatCurrency(1_500_000);
    // Should contain M for millions
    expect(result).toContain('M');
    expect(result).toMatch(/€|EUR/);
  });

  it('uses compact notation for large USD values', () => {
    const result = formatCurrency(2_400_000, { currency: 'USD', locale: 'en-US' });
    expect(result).toContain('M');
    expect(result).toMatch(/\$|USD/);
  });

  it('respects maximumFractionDigits override', () => {
    const result = formatCurrency(1.5, { maximumFractionDigits: 0 });
    // Should not contain a decimal point or fraction
    expect(result).not.toMatch(/\.\d+/);
  });
});

// ---------------------------------------------------------------------------
// formatPercent — INPUT CONVENTION: ratio (0.25 = 25%)
// ---------------------------------------------------------------------------

describe('formatPercent', () => {
  it('treats input as a ratio: 0.25 → "25.00%"', () => {
    const result = formatPercent(0.25);
    expect(result).toContain('25');
    expect(result).toContain('%');
  });

  it('handles small ratio: 0.0123 → ~"1.23%"', () => {
    const result = formatPercent(0.0123);
    expect(result).toContain('1.23');
    expect(result).toContain('%');
  });

  it('respects maximumFractionDigits: 0', () => {
    const result = formatPercent(0.1, { maximumFractionDigits: 0 });
    expect(result).toContain('10');
    expect(result).toContain('%');
    expect(result).not.toMatch(/\.\d/);
  });

  it('uses signed display for positive ratios when signed: true', () => {
    const result = formatPercent(0.05, { signed: true });
    expect(result).toContain('+');
  });

  it('negative ratio without signed flag still shows minus', () => {
    const result = formatPercent(-0.034);
    expect(result).toMatch(/-|−/); // hyphen-minus or unicode minus
    expect(result).toContain('3.40');
    expect(result).toContain('%');
  });
});

// ---------------------------------------------------------------------------
// formatCompact
// ---------------------------------------------------------------------------

describe('formatCompact', () => {
  it('formats 1_200_000 as containing "M"', () => {
    const result = formatCompact(1_200_000);
    expect(result).toContain('M');
    expect(result).toContain('1.2');
  });

  it('formats 340_000 as containing "K"', () => {
    const result = formatCompact(340_000);
    expect(result).toContain('K');
    expect(result).toContain('340');
  });

  it('formats with currency when provided', () => {
    const result = formatCompact(1_500_000, { currency: 'USD', locale: 'en-US' });
    expect(result).toContain('M');
    expect(result).toMatch(/\$|USD/);
  });
});

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------

describe('formatNumber', () => {
  it('formats with grouping separators', () => {
    const result = formatNumber(1_234_567);
    expect(result).toContain('234');
    // Should have some kind of thousands separator
    expect(result).toMatch(/1[,\s ]?234/);
  });

  it('respects maximumFractionDigits: 0 (no decimals)', () => {
    const result = formatNumber(1234.789, { maximumFractionDigits: 0 });
    expect(result).not.toMatch(/\.\d/);
    expect(result).toContain('1,235');
  });

  it('respects maximumFractionDigits: 4', () => {
    const result = formatNumber(3.14159265, { maximumFractionDigits: 4 });
    expect(result).toContain('3.1416');
  });
});

// ---------------------------------------------------------------------------
// Cache reuse
// ---------------------------------------------------------------------------

describe('cache reuse', () => {
  it('returns equal strings for identical calls (cached path)', () => {
    const a = formatCurrency(1234, { currency: 'EUR' });
    const b = formatCurrency(1234, { currency: 'EUR' });
    expect(a).toBe(b);
  });

  it('returns equal strings for identical percent calls', () => {
    const a = formatPercent(0.5);
    const b = formatPercent(0.5);
    expect(a).toBe(b);
  });

  it('returns equal strings for identical compact calls', () => {
    const a = formatCompact(1_000_000);
    const b = formatCompact(1_000_000);
    expect(a).toBe(b);
  });

  it('returns equal strings for identical formatNumber calls', () => {
    const a = formatNumber(42, { maximumFractionDigits: 2 });
    const b = formatNumber(42, { maximumFractionDigits: 2 });
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// truncateAddress
// ---------------------------------------------------------------------------

describe('truncateAddress', () => {
  it('truncates a long address', () => {
    const addr = '0xAbCdEfGh1234567890';
    const result = truncateAddress(addr);
    expect(result).toContain('0xAbCd');
    expect(result).toContain('7890');
    expect(result).toContain('…');
  });

  it('returns short address unchanged', () => {
    const addr = '0xAbCd';
    expect(truncateAddress(addr)).toBe(addr);
  });

  it('returns empty string for empty input', () => {
    expect(truncateAddress('')).toBe('');
  });

  it('returns non-0x address unchanged', () => {
    const addr = 'not-an-eth-address';
    expect(truncateAddress(addr)).toBe(addr);
  });
});
