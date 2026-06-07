/**
 * Film & TV connector — high-level resolve: a LarAction in, a FilmResolution out.
 * Query → seed (Wikipedia, for the card) → outward watch links (static, always total).
 *
 * Bright-line: resolves + builds outward links ONLY. Lar never hosts, streams,
 * or sells video content — it routes the user outward. JustWatch-led neutral
 * framing: we link to the aggregator first so the user picks where to watch.
 */
import type { LarAction } from '@lar/shared';
import { searchTitle } from './wikipedia.js';

export type WatchLink =
  | 'justwatch'
  | 'netflix'
  | 'prime_video'
  | 'disney_plus'
  | 'apple_tv'
  | 'youtube'
  | 'letterboxd';

export interface FilmResolution {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  wikipediaUrl: string;
  links: Record<WatchLink, string>;
}

/**
 * Pure: builds outward watch links from a query string. No network — unit-testable.
 * Total — every WatchLink is always present (typed as a full Record, not Partial).
 *
 * JustWatch is the neutral aggregator ("where can I watch this?") and leads the
 * set. All others are outward routes only — Lar never streams or sells video.
 */
export function buildWatchLinks(query: string): Record<WatchLink, string> {
  const enc = encodeURIComponent(query);
  return {
    // THE neutral "where can I watch this" aggregator — lead with it.
    justwatch: `https://www.justwatch.com/us/search?q=${enc}`,
    netflix: `https://www.netflix.com/search?q=${enc}`,
    prime_video: `https://www.amazon.com/s?k=${enc}&i=instant-video`,
    disney_plus: `https://www.disneyplus.com/search?q=${enc}`,
    apple_tv: `https://tv.apple.com/search?term=${enc}`,
    youtube: `https://www.youtube.com/results?search_query=${enc}`,
    // Neutral film database — your taste record, not a walled-garden store.
    letterboxd: `https://letterboxd.com/search/${enc}/`,
  };
}

export async function resolveFilm(
  action: LarAction,
  fetchImpl: typeof fetch = fetch,
): Promise<FilmResolution> {
  // Wikipedia enriches the card (title, description, thumbnail).
  // Watch links are always built from the raw query — they never depend on Wikipedia.
  // Bright-line: links only, Lar never hosts or streams video.
  const seed = await searchTitle(action.entity.query, fetchImpl);
  const links = buildWatchLinks(action.entity.query);
  return {
    title: seed.title,
    description: seed.description,
    thumbnailUrl: seed.thumbnailUrl,
    wikipediaUrl: seed.wikipediaUrl,
    links,
  };
}
