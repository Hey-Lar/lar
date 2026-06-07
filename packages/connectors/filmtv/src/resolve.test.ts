import { describe, it, expect, vi } from 'vitest';
import { parseLarAction } from '@lar/shared';
import { buildWatchLinks, resolveFilm } from './resolve.js';

function jsonRes(payload: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => payload } as Response;
}

/** Fake fetch routed by URL substring: [matchSubstring, payload][]. */
function fakeFetch(routes: Array<[string, unknown, boolean?, number?]>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [match, payload, ok = true, status = 200] of routes) {
      if (url.includes(match)) return jsonRes(payload, ok, status);
    }
    throw new Error(`no fake route for ${url}`);
  }) as unknown as typeof fetch;
}

const wikiPayload = {
  pages: [
    {
      key: 'Dune_(2021_film)',
      title: 'Dune (2021 film)',
      description: 'Epic sci-fi film directed by Denis Villeneuve',
      thumbnail: { url: '//upload.wikimedia.org/wikipedia/en/thumb/dune.jpg' },
    },
  ],
};

const action = parseLarAction({
  intent: 'open',
  domain: 'film',
  entity: { type: 'movie', query: 'dune movie' },
});

// ── buildWatchLinks ───────────────────────────────────────────────────────────

describe('buildWatchLinks', () => {
  it('always includes all 7 watch links', () => {
    const links = buildWatchLinks('Dune');
    expect(links['justwatch']).toBeTruthy();
    expect(links['netflix']).toBeTruthy();
    expect(links['prime_video']).toBeTruthy();
    expect(links['disney_plus']).toBeTruthy();
    expect(links['apple_tv']).toBeTruthy();
    expect(links['youtube']).toBeTruthy();
    expect(links['letterboxd']).toBeTruthy();
  });

  it('encodes spaces as %20 in all 7 links', () => {
    const links = buildWatchLinks('dune movie');
    const enc = encodeURIComponent('dune movie');
    for (const url of Object.values(links)) {
      expect(url).toContain(enc);
    }
  });

  it('encodes &, # and other URL-significant chars so the query cannot break out', () => {
    const q = 'AT&T #1 movie';
    const enc = encodeURIComponent(q); // -> AT%26T%20%231%20movie
    expect(enc).toContain('%26'); // & encoded
    expect(enc).toContain('%23'); // # encoded
    const links = buildWatchLinks(q);
    for (const url of Object.values(links)) {
      expect(url).toContain(enc);
    }
    // The raw ampersand must never leak into justwatch's single-param URL
    // (it would split q=… and silently change the search), nor the raw hash.
    expect(links['justwatch']).not.toContain('AT&T');
    expect(links['justwatch']).not.toContain('#1');
  });

  it('justwatch link points to justwatch.com', () => {
    const links = buildWatchLinks('Dune');
    expect(links['justwatch']).toContain('justwatch.com');
  });

  it('netflix link points to netflix.com/search', () => {
    const links = buildWatchLinks('Dune');
    expect(links['netflix']).toContain('netflix.com/search');
  });

  it('prime_video link points to amazon.com with instant-video', () => {
    const links = buildWatchLinks('Dune');
    expect(links['prime_video']).toContain('amazon.com');
    expect(links['prime_video']).toContain('instant-video');
  });

  it('disney_plus link points to disneyplus.com/search', () => {
    const links = buildWatchLinks('Dune');
    expect(links['disney_plus']).toContain('disneyplus.com/search');
  });

  it('apple_tv link points to tv.apple.com/search', () => {
    const links = buildWatchLinks('Dune');
    expect(links['apple_tv']).toContain('tv.apple.com/search');
  });

  it('youtube link points to youtube.com/results', () => {
    const links = buildWatchLinks('Dune');
    expect(links['youtube']).toContain('youtube.com/results');
  });

  it('letterboxd link points to letterboxd.com/search', () => {
    const links = buildWatchLinks('Dune');
    expect(links['letterboxd']).toContain('letterboxd.com/search');
  });
});

// ── resolveFilm ───────────────────────────────────────────────────────────────

describe('resolveFilm', () => {
  it('resolves title, description, thumbnailUrl (https: prefix), wikipediaUrl, and all links', async () => {
    const fetchImpl = fakeFetch([['wikipedia.org', wikiPayload]]);
    const r = await resolveFilm(action, fetchImpl);
    expect(r.title).toBe('Dune (2021 film)');
    expect(r.description).toBe('Epic sci-fi film directed by Denis Villeneuve');
    // Protocol-relative thumbnail must be prefixed with https:
    expect(r.thumbnailUrl).toBe('https://upload.wikimedia.org/wikipedia/en/thumb/dune.jpg');
    expect(r.wikipediaUrl).toContain('wikipedia.org/wiki/Dune_(2021_film)');
    expect(r.links['justwatch']).toContain('justwatch.com');
    expect(r.links['netflix']).toContain('netflix.com');
    expect(r.links['letterboxd']).toContain('letterboxd.com');
  });

  it('rejects when Wikipedia returns no pages', async () => {
    const emptyFetch = fakeFetch([['wikipedia.org', { pages: [] }]]);
    await expect(resolveFilm(action, emptyFetch)).rejects.toThrow('No title found');
  });

  it('rejects when Wikipedia returns a non-ok HTTP response', async () => {
    const errorFetch = vi.fn(async () => jsonRes({}, false, 500)) as unknown as typeof fetch;
    await expect(resolveFilm(action, errorFetch)).rejects.toThrow('HTTP 500');
  });

  it('leaves thumbnailUrl undefined when thumbnail is null', async () => {
    const noThumbPayload = {
      pages: [
        {
          key: 'Dune_(2021_film)',
          title: 'Dune (2021 film)',
          description: 'Epic sci-fi film',
          thumbnail: null,
        },
      ],
    };
    const fetchImpl = fakeFetch([['wikipedia.org', noThumbPayload]]);
    const r = await resolveFilm(action, fetchImpl);
    expect(r.thumbnailUrl).toBeUndefined();
  });

  it('leaves thumbnailUrl undefined when thumbnail.url is absent', async () => {
    const noUrlPayload = {
      pages: [
        {
          key: 'Dune_(2021_film)',
          title: 'Dune (2021 film)',
          thumbnail: {},
        },
      ],
    };
    const fetchImpl = fakeFetch([['wikipedia.org', noUrlPayload]]);
    const r = await resolveFilm(action, fetchImpl);
    expect(r.thumbnailUrl).toBeUndefined();
  });

  it('handles thumbnail URL that already has a protocol (no double-prefix)', async () => {
    const httpsThumbPayload = {
      pages: [
        {
          key: 'Dune_(2021_film)',
          title: 'Dune (2021 film)',
          thumbnail: { url: 'https://upload.wikimedia.org/some.jpg' },
        },
      ],
    };
    const fetchImpl = fakeFetch([['wikipedia.org', httpsThumbPayload]]);
    const r = await resolveFilm(action, fetchImpl);
    expect(r.thumbnailUrl).toBe('https://upload.wikimedia.org/some.jpg');
  });

  // Live end-to-end (no key). Run with: LAR_LIVE=1 npx vitest run
  it.skipIf(process.env['LAR_LIVE'] !== '1')(
    'resolves dune movie live (Wikipedia + JustWatch link)',
    async () => {
      const r = await resolveFilm(
        parseLarAction({
          intent: 'open',
          domain: 'film',
          entity: { type: 'movie', query: 'dune movie' },
        }),
      );
      expect(r.links['justwatch']).toContain('justwatch.com');
      expect(r.wikipediaUrl).toContain('wikipedia.org');
      expect(r.title.length).toBeGreaterThan(0);
    },
    20000,
  );
});
