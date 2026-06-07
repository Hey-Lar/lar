import { describe, it, expect, vi } from 'vitest';
import { parseLarAction } from '@lar/shared';
import { buildBookLinks, resolveBook } from './resolve.js';
import type { BookSeed } from './openlibrary.js';

function jsonRes(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response;
}

/** Fake fetch routed by URL substring: [matchSubstring, payload][]. */
function fakeFetch(routes: Array<[string, unknown]>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [match, payload] of routes) if (url.includes(match)) return jsonRes(payload);
    throw new Error(`no fake route for ${url}`);
  }) as unknown as typeof fetch;
}

const seedWithIsbn: BookSeed = {
  title: 'The Pragmatic Programmer',
  author: 'David Thomas',
  year: 1999,
  coverUrl: 'https://covers.openlibrary.org/b/id/8310208-M.jpg',
  isbn: '020161622X',
  openLibraryUrl: 'https://openlibrary.org/works/OL5765103W',
};

const seedWithoutIsbn: BookSeed = {
  title: 'Some Unknown Book',
  author: 'Some Author',
  year: 2020,
  openLibraryUrl: 'https://openlibrary.org/works/OL99999W',
};

describe('buildBookLinks', () => {
  it('always includes open_library, library, apple_books, kindle, kobo, google_books', () => {
    const links = buildBookLinks(seedWithIsbn);
    expect(links['open_library']).toBeTruthy();
    expect(links['library']).toBeTruthy();
    expect(links['apple_books']).toBeTruthy();
    expect(links['kindle']).toBeTruthy();
    expect(links['kobo']).toBeTruthy();
    expect(links['google_books']).toBeTruthy();
  });

  it('with ISBN: kindle → amazon /dp/<isbn>, google_books → ?vid=ISBN<isbn>', () => {
    const links = buildBookLinks(seedWithIsbn);
    expect(links['kindle']).toBe(`https://www.amazon.com/dp/${seedWithIsbn.isbn}`);
    expect(links['google_books']).toBe(
      `https://books.google.com/books?vid=ISBN${seedWithIsbn.isbn}`,
    );
  });

  it('without ISBN: kindle → amazon search, google_books → google search', () => {
    const links = buildBookLinks(seedWithoutIsbn);
    const enc = encodeURIComponent('Some Unknown Book Some Author');
    expect(links['kindle']).toBe(`https://www.amazon.com/s?k=${enc}&i=stripbooks`);
    expect(links['google_books']).toBe(`https://www.google.com/search?tbm=bks&q=${enc}`);
  });

  it('library link always points to WorldCat', () => {
    const links = buildBookLinks(seedWithIsbn);
    expect(links['library']).toContain('worldcat.org');
  });

  it('open_library link equals the seed openLibraryUrl', () => {
    const links = buildBookLinks(seedWithIsbn);
    expect(links['open_library']).toBe(seedWithIsbn.openLibraryUrl);
  });

  it('apple_books link contains books.apple.com/search', () => {
    const links = buildBookLinks(seedWithIsbn);
    expect(links['apple_books']).toContain('books.apple.com/search');
  });

  it('kobo link contains kobo.com/search', () => {
    const links = buildBookLinks(seedWithIsbn);
    expect(links['kobo']).toContain('kobo.com/search');
  });
});

const olPayload = {
  docs: [
    {
      title: 'The Pragmatic Programmer',
      author_name: ['David Thomas'],
      first_publish_year: 1999,
      cover_i: 8310208,
      key: '/works/OL5765103W',
      isbn: ['020161622X', '9780201616224'],
    },
  ],
};

describe('resolveBook', () => {
  const fetchImpl = fakeFetch([['openlibrary.org', olPayload]]);

  const action = parseLarAction({
    intent: 'open',
    domain: 'book',
    entity: { type: 'track', query: 'the pragmatic programmer' },
  });

  it('resolves title, author, openLibraryUrl, and correct links', async () => {
    const r = await resolveBook(action, fetchImpl);
    expect(r.title).toBe('The Pragmatic Programmer');
    expect(r.author).toBe('David Thomas');
    expect(r.openLibraryUrl).toContain('openlibrary.org');
    expect(r.links['open_library']).toContain('openlibrary.org');
    expect(r.links['library']).toContain('worldcat.org');
    expect(r.links['kindle']).toContain('amazon.com/dp/020161622X');
  });

  it('rejects when Open Library returns no docs', async () => {
    const emptyFetch = fakeFetch([['openlibrary.org', { docs: [] }]]);
    await expect(resolveBook(action, emptyFetch)).rejects.toThrow();
  });

  it('rejects when Open Library returns a non-ok response', async () => {
    const errorFetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    await expect(resolveBook(action, errorFetch)).rejects.toThrow('HTTP 500');
  });

  it('handles missing cover_i gracefully (coverUrl is undefined)', async () => {
    const noCoverPayload = {
      docs: [
        {
          title: 'The Pragmatic Programmer',
          author_name: ['David Thomas'],
          first_publish_year: 1999,
          key: '/works/OL5765103W',
        },
      ],
    };
    const noCoverFetch = fakeFetch([['openlibrary.org', noCoverPayload]]);
    const r = await resolveBook(action, noCoverFetch);
    expect(r.coverUrl).toBeUndefined();
  });

  // Live end-to-end (no key). Run with: LAR_LIVE=1 npm test
  it.skipIf(process.env['LAR_LIVE'] !== '1')(
    'resolves a real book live',
    async () => {
      const r = await resolveBook(
        parseLarAction({
          intent: 'open',
          domain: 'book',
          entity: { type: 'track', query: 'the pragmatic programmer' },
        }),
      );
      expect(r.openLibraryUrl).toContain('openlibrary.org');
      expect(r.links['library']).toContain('worldcat');
      expect(r.title.length).toBeGreaterThan(0);
    },
    20000,
  );
});
