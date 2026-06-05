/**
 * Podcast connector — high-level resolve: a LarAction in, a PodcastResolution out.
 * Query → seed (iTunes) → outward links (Apple Podcasts, RSS, Spotify search, YouTube search).
 *
 * Bright-line: resolves + builds links only, never streams/proxies audio.
 */
import type { LarAction } from '@lar/shared';
import { searchPodcast, type PodcastSeed, type PodcastPlatform } from './itunes-podcasts';

export interface PodcastResolution {
  title: string;
  author: string;
  artworkUrl?: string;
  applePodcastsUrl: string;
  feedUrl?: string;
  genre?: string;
  links: Partial<Record<PodcastPlatform, string>>;
}

/** Pure: builds outward links from a seed. No network — unit-testable. */
export function buildPodcastLinks(seed: PodcastSeed): Partial<Record<PodcastPlatform, string>> {
  const links: Partial<Record<PodcastPlatform, string>> = {
    apple_podcasts: seed.applePodcastsUrl,
    spotify: `https://open.spotify.com/search/${encodeURIComponent(seed.title)}/podcasts`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(seed.title + ' podcast')}`,
  };
  if (seed.feedUrl) {
    links['rss'] = seed.feedUrl;
  }
  return links;
}

export async function resolvePodcast(
  action: LarAction,
  fetchImpl: typeof fetch = fetch,
): Promise<PodcastResolution> {
  const seed = await searchPodcast(action.entity.query, fetchImpl);
  const links = buildPodcastLinks(seed);
  return {
    title: seed.title,
    author: seed.author,
    artworkUrl: seed.artworkUrl,
    applePodcastsUrl: seed.applePodcastsUrl,
    feedUrl: seed.feedUrl,
    genre: seed.genre,
    links,
  };
}
