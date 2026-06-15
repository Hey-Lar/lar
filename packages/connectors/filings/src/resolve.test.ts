import { describe, it, expect } from 'vitest';
import { buildPrimarySourceLinks, PRIMARY_SOURCE_IDS } from './resolve.js';

describe('buildPrimarySourceLinks', () => {
  it('returns every neutral source with the encoded symbol', () => {
    const links = buildPrimarySourceLinks('VWCE');
    expect(links.map((l) => l.id).sort()).toEqual([...PRIMARY_SOURCE_IDS].sort());
    for (const l of links) {
      expect(l.url).toContain('VWCE');
      expect(l.url).toMatch(/^https:\/\//);
      expect(l.why.length).toBeGreaterThan(0);
    }
  });

  it('routes to the company’s OWN filings (SEC EDGAR is a primary source)', () => {
    const edgar = buildPrimarySourceLinks('AAPL').find((l) => l.id === 'edgar');
    expect(edgar?.kind).toBe('primary');
    expect(edgar?.url).toContain('sec.gov');
    expect(edgar?.url).toContain('type=10-K');
  });

  it('classifies sources (primary / reference / macro)', () => {
    const links = buildPrimarySourceLinks('IWDA');
    expect(links.filter((l) => l.kind === 'primary').length).toBeGreaterThanOrEqual(2);
    expect(links.find((l) => l.id === 'fred')?.kind).toBe('macro');
    expect(links.find((l) => l.id === 'yahoo')?.kind).toBe('reference');
  });

  it('encodes special characters and is total on an empty symbol', () => {
    expect(() => buildPrimarySourceLinks('   ')).not.toThrow();
    const links = buildPrimarySourceLinks('S&P 500');
    for (const l of links) expect(l.url).not.toContain(' ');
    expect(buildPrimarySourceLinks('').length).toBe(PRIMARY_SOURCE_IDS.length);
  });
});
