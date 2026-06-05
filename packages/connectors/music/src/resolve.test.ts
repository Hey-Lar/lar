import { describe, it, expect, vi } from 'vitest';
import { parseLarAction } from '@lar/shared';
import { pickPlatform, resolveMusic } from './resolve';

const DEFAULT = ['spotify', 'apple_music', 'tidal', 'youtube_music', 'deezer'] as const;

describe('pickPlatform', () => {
  it('honors an explicit, available platform', () => {
    expect(pickPlatform('spotify', [...DEFAULT], ['spotify', 'tidal'])).toBe('spotify');
  });

  it('falls back to priority when the requested platform is unavailable', () => {
    expect(pickPlatform('tidal', ['spotify', 'tidal'], ['spotify'])).toBe('spotify');
  });

  it('auto uses the user priority order', () => {
    expect(pickPlatform('auto', ['apple_music', 'spotify'], ['spotify'])).toBe('spotify');
  });

  it('falls back to odesli when nothing is available', () => {
    expect(pickPlatform('auto', [...DEFAULT], [])).toBe('odesli');
  });
});

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

const itunesPayload = {
  resultCount: 1,
  results: [
    {
      trackName: 'Mr. Brightside',
      artistName: 'The Killers',
      trackViewUrl: 'https://music.apple.com/us/album/mr-brightside/x?i=1',
      artworkUrl100: 'https://art/100x100.jpg',
    },
  ],
};

const odesliPayload = {
  entityUniqueId: 'X',
  pageUrl: 'https://song.link/x',
  linksByPlatform: {
    spotify: { url: 'https://open.spotify.com/track/abc' },
    tidal: { url: 'https://tidal.com/browse/track/123' },
  },
  entitiesByUniqueId: { X: { title: 'Mr. Brightside', artistName: 'The Killers' } },
};

describe('resolveMusic', () => {
  const fetchImpl = fakeFetch([
    ['itunes.apple.com', itunesPayload],
    ['song.link', odesliPayload],
  ]);

  const action = (platform: string) =>
    parseLarAction({
      intent: 'play',
      domain: 'music',
      entity: { type: 'track', query: 'Mr Brightside' },
      platform,
    });

  it('routes to an explicitly requested, available platform', async () => {
    const r = await resolveMusic(action('tidal'), {}, fetchImpl);
    expect(r.chosenPlatform).toBe('tidal');
    expect(r.openUrl).toContain('tidal.com');
    expect(r.title).toBe('Mr. Brightside');
  });

  it('auto-picks by user priority', async () => {
    const r = await resolveMusic(
      action('auto'),
      { platformPriority: ['spotify', 'tidal'] },
      fetchImpl,
    );
    expect(r.chosenPlatform).toBe('spotify');
    expect(r.openUrl).toContain('open.spotify.com');
  });

  it('falls back when the requested platform is not in the link set', async () => {
    const r = await resolveMusic(
      action('apple_music'),
      { platformPriority: ['tidal', 'spotify'] },
      fetchImpl,
    );
    expect(r.chosenPlatform).toBe('tidal');
  });

  // Live end-to-end (no key). Run with: LAR_LIVE=1 npm test
  // NOTE: the keyless seed comes from iTunes (an Apple URL), and Odesli does
  // not always cross-match Spotify from an Apple seed — so we assert on Tidal,
  // which Odesli reliably returns. Explicit-Spotify routing is best-effort in
  // Phase 1 (a Spotify-auth seed, gated, makes it reliable later).
  it.skipIf(process.env.LAR_LIVE !== '1')(
    'resolves a real track live and deep-links to the requested platform',
    async () => {
      const r = await resolveMusic(action('tidal'));
      expect(r.chosenPlatform).toBe('tidal');
      expect(r.openUrl).toContain('tidal');
      expect(r.title.length).toBeGreaterThan(0);
    },
    20000,
  );
});
