import { describe, it, expect } from 'vitest';
import { buildNewsLinks, NEWS_SOURCE_IDS } from './resolve.js';

describe('buildNewsLinks', () => {
  it('returns every curated source with an encoded topic', () => {
    const links = buildNewsLinks('climate policy');
    expect(links.map((l) => l.id).sort()).toEqual([...NEWS_SOURCE_IDS].sort());
    for (const l of links) {
      expect(l.url).toContain('climate%20policy');
      expect(l.url).toMatch(/^https:\/\//);
      expect(l.why.length).toBeGreaterThan(0);
    }
  });

  it('includes a bias-aware source (Ground News) and two wire services', () => {
    const links = buildNewsLinks('election');
    const byKind = (k: string) => links.filter((l) => l.kind === k);
    expect(links.find((l) => l.id === 'ground-news')?.kind).toBe('bias-aware');
    expect(
      byKind('wire')
        .map((l) => l.id)
        .sort(),
    ).toEqual(['ap-news', 'reuters']);
    expect(byKind('reference').length).toBeGreaterThanOrEqual(2);
  });

  it('encodes special characters safely (no raw spaces / ampersands)', () => {
    const links = buildNewsLinks('AI & jobs');
    for (const l of links) {
      const query = l.url.split('?')[1] ?? '';
      expect(query).not.toContain(' ');
      expect(l.url).toContain(encodeURIComponent('AI & jobs'));
    }
  });

  it('is total — an empty topic still yields the full source set without throwing', () => {
    expect(() => buildNewsLinks('   ')).not.toThrow();
    expect(buildNewsLinks('').length).toBe(NEWS_SOURCE_IDS.length);
  });
});
