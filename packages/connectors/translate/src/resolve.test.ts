import { describe, it, expect } from 'vitest';
import { buildTranslateLinks, resolveTranslate, LANGS } from './resolve.js';

function mockFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () =>
    ({ ok, status, json: async () => body }) as unknown as Response) as typeof fetch;
}

describe('buildTranslateLinks', () => {
  it('builds encoded outward links for DeepL, Google, WordReference', () => {
    const links = buildTranslateLinks('good morning', 'en', 'es');
    expect(links.deepl).toBe('https://www.deepl.com/translator#en/es/good%20morning');
    expect(links.google).toContain('sl=en');
    expect(links.google).toContain('tl=es');
    expect(links.google).toContain('text=good%20morning');
    expect(links.wordreference).toBe('https://www.wordreference.com/enes/good%20morning');
  });

  it('encodes special characters safely', () => {
    const links = buildTranslateLinks('¿qué tal?', 'es', 'en');
    expect(links.deepl).not.toContain(' ');
    expect(links.deepl).toContain(encodeURIComponent('¿qué tal?'));
  });
});

describe('resolveTranslate', () => {
  it('returns the translation + links from a successful response', async () => {
    const r = await resolveTranslate(
      'good morning',
      'en',
      'es',
      mockFetch({ responseData: { translatedText: 'buenos días', match: 0.98 } }),
    );
    expect(r).toMatchObject({
      source: 'good morning',
      translated: 'buenos días',
      from: 'en',
      to: 'es',
      match: 0.98,
    });
    expect(r.links.deepl).toContain('en/es');
  });

  it('trims the source text', async () => {
    const r = await resolveTranslate(
      '  hello  ',
      'en',
      'fr',
      mockFetch({ responseData: { translatedText: 'bonjour' } }),
    );
    expect(r.source).toBe('hello');
  });

  it('rejects empty text', async () => {
    await expect(resolveTranslate('   ', 'en', 'es', mockFetch({}))).rejects.toThrow(
      'nothing to translate',
    );
  });

  it('rejects an unsupported language', async () => {
    await expect(resolveTranslate('hi', 'en', 'xx', mockFetch({}))).rejects.toThrow(
      /not supported/,
    );
    await expect(resolveTranslate('hi', 'zz', 'es', mockFetch({}))).rejects.toThrow(
      /not supported/,
    );
  });

  it('throws on an upstream error status', async () => {
    await expect(resolveTranslate('hi', 'en', 'es', mockFetch({}, false, 429))).rejects.toThrow(
      'translation service 429',
    );
  });

  it('throws when the response has no usable translation', async () => {
    await expect(
      resolveTranslate('hi', 'en', 'es', mockFetch({ responseData: {} })),
    ).rejects.toThrow('translation unavailable');
  });

  it('exposes a sane language allow-list', () => {
    expect(LANGS.length).toBeGreaterThanOrEqual(6);
    expect(LANGS.map((l) => l.code)).toContain('en');
    expect(LANGS.map((l) => l.code)).toContain('pt');
  });

  // Live smoke (opt-in): hits the real keyless MyMemory endpoint.
  const live = process.env.LAR_LIVE === '1' ? it : it.skip;
  live(
    'translates live via MyMemory (keyless)',
    async () => {
      const r = await resolveTranslate('good morning', 'en', 'es');
      expect(r.translated.toLowerCase()).toContain('bue'); // "buenos días" / "buen…"
    },
    15_000,
  );
});
