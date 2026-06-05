/**
 * iTunes Search API — free, no key. Turns a free-text query into a podcast
 * seed (Apple Podcasts URL + RSS feed) for downstream link building.
 *
 * Bright-line: metadata + launch URLs only. We never fetch or proxy audio.
 */

const ITUNES_SEARCH = 'https://itunes.apple.com/search';

export type PodcastPlatform = 'apple_podcasts' | 'rss' | 'spotify' | 'youtube';

export interface PodcastSeed {
  title: string;
  author: string;
  artworkUrl?: string;
  /** Apple Podcasts collection page — the canonical Lar launch URL for this show. */
  applePodcastsUrl: string;
  feedUrl?: string;
  genre?: string;
}

interface ItunesPodcastResult {
  collectionName?: string;
  artistName?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  collectionViewUrl?: string;
  feedUrl?: string;
  primaryGenreName?: string;
}

export async function searchPodcast(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PodcastSeed> {
  const url = `${ITUNES_SEARCH}?media=podcast&entity=podcast&limit=1&term=${encodeURIComponent(query)}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`iTunes podcast search failed: HTTP ${res.status}`);
  const data = (await res.json()) as { resultCount: number; results: ItunesPodcastResult[] };
  const top = data.results?.[0];
  if (!top?.collectionViewUrl || !top.collectionName) {
    throw new Error(`No podcast found for "${query}"`);
  }
  return {
    title: top.collectionName,
    author: top.artistName ?? '',
    artworkUrl: top.artworkUrl600 ?? top.artworkUrl100,
    applePodcastsUrl: top.collectionViewUrl,
    feedUrl: top.feedUrl,
    genre: top.primaryGenreName,
  };
}
