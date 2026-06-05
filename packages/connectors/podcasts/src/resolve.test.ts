import { describe, it, expect, vi } from 'vitest';
import { parseLarAction } from '@lar/shared';
import { buildPodcastLinks, resolvePodcast } from './resolve';
import type { PodcastSeed } from './itunes-podcasts';

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

const seedWithFeed: PodcastSeed = {
  title: 'The Daily',
  author: 'The New York Times',
  artworkUrl: 'https://art/600x600.jpg',
  applePodcastsUrl: 'https://podcasts.apple.com/us/podcast/the-daily/id1200361736',
  feedUrl: 'https://feeds.simplecast.com/54nAGcIl',
  genre: 'News',
};

const seedWithoutFeed: PodcastSeed = {
  title: 'Some Show',
  author: 'Some Author',
  applePodcastsUrl: 'https://podcasts.apple.com/us/podcast/some-show/id999',
};

describe('buildPodcastLinks', () => {
  it('includes apple_podcasts, rss, spotify, youtube when feedUrl is set', () => {
    const links = buildPodcastLinks(seedWithFeed);
    expect(links['apple_podcasts']).toBe(seedWithFeed.applePodcastsUrl);
    expect(links['rss']).toBe(seedWithFeed.feedUrl);
    expect(links['spotify']).toContain('open.spotify.com/search');
    expect(links['spotify']).toContain('/podcasts');
    expect(links['spotify']).toContain(encodeURIComponent('The Daily'));
    expect(links['youtube']).toContain('youtube.com/results');
    expect(links['youtube']).toContain(encodeURIComponent('The Daily podcast'));
  });

  it('omits rss when feedUrl is not set', () => {
    const links = buildPodcastLinks(seedWithoutFeed);
    expect(links['apple_podcasts']).toBe(seedWithoutFeed.applePodcastsUrl);
    expect(links['rss']).toBeUndefined();
    expect(links['spotify']).toContain('open.spotify.com/search');
    expect(links['spotify']).toContain('/podcasts');
    expect(links['youtube']).toContain('youtube.com/results');
    expect(Object.keys(links)).not.toContain('rss');
  });
});

const itunesPodcastPayload = {
  resultCount: 1,
  results: [
    {
      collectionName: 'The Daily',
      artistName: 'The New York Times',
      collectionViewUrl: 'https://podcasts.apple.com/us/podcast/the-daily/id1200361736',
      feedUrl: 'https://feeds.simplecast.com/54nAGcIl',
      artworkUrl600: 'https://art/600x600.jpg',
      primaryGenreName: 'News',
    },
  ],
};

describe('resolvePodcast', () => {
  const fetchImpl = fakeFetch([['itunes.apple.com', itunesPodcastPayload]]);

  const action = parseLarAction({
    intent: 'play',
    domain: 'podcast',
    entity: { type: 'show', query: 'The Daily' },
  });

  it('resolves title, author, applePodcastsUrl, and correct links', async () => {
    const r = await resolvePodcast(action, fetchImpl);
    expect(r.title).toBe('The Daily');
    expect(r.author).toBe('The New York Times');
    expect(r.applePodcastsUrl).toBe('https://podcasts.apple.com/us/podcast/the-daily/id1200361736');
    expect(r.links['apple_podcasts']).toBe(
      'https://podcasts.apple.com/us/podcast/the-daily/id1200361736',
    );
    expect(r.links['rss']).toBe('https://feeds.simplecast.com/54nAGcIl');
  });

  it('rejects when iTunes returns no results', async () => {
    const emptyFetch = fakeFetch([['itunes.apple.com', { resultCount: 0, results: [] }]]);
    await expect(resolvePodcast(action, emptyFetch)).rejects.toThrow();
  });

  it('rejects with HTTP 500 when iTunes returns a non-ok response', async () => {
    const errorFetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    await expect(resolvePodcast(action, errorFetch)).rejects.toThrow('HTTP 500');
  });

  it('falls back to artworkUrl100 when artworkUrl600 is absent', async () => {
    const artworkFetch = fakeFetch([
      [
        'itunes.apple.com',
        {
          resultCount: 1,
          results: [
            {
              collectionName: 'The Daily',
              artistName: 'The New York Times',
              collectionViewUrl: 'https://podcasts.apple.com/us/podcast/the-daily/id1200361736',
              artworkUrl100: 'https://art/100x100.jpg',
            },
          ],
        },
      ],
    ]);
    const r = await resolvePodcast(action, artworkFetch);
    expect(r.artworkUrl).toBe('https://art/100x100.jpg');
  });

  // Live end-to-end (no key). Run with: LAR_LIVE=1 npm test
  it.skipIf(process.env.LAR_LIVE !== '1')(
    'resolves a real show live',
    async () => {
      const r = await resolvePodcast(
        parseLarAction({
          intent: 'play',
          domain: 'podcast',
          entity: { type: 'show', query: 'The Daily' },
        }),
      );
      expect(r.applePodcastsUrl).toContain('podcasts.apple.com');
      expect(r.title.length).toBeGreaterThan(0);
    },
    20000,
  );
});
