/**
 * iTunes Search API — free, no key. Turns a free-text query into a seed
 * track URL we can hand to Odesli for cross-platform resolution.
 *
 * Bright-line: metadata + a launch URL only. We never fetch or proxy audio.
 */

const ITUNES_SEARCH = 'https://itunes.apple.com/search';

export interface TrackSeed {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  /** Apple/iTunes trackViewUrl — the seed Odesli resolves from. */
  seedUrl: string;
}

interface ItunesResult {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

export async function searchTrack(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TrackSeed> {
  const url = `${ITUNES_SEARCH}?media=music&entity=song&limit=1&term=${encodeURIComponent(query)}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`iTunes search failed: HTTP ${res.status}`);
  const data = (await res.json()) as { resultCount: number; results: ItunesResult[] };
  const top = data.results?.[0];
  if (!top?.trackViewUrl || !top.trackName) {
    throw new Error(`No track found for "${query}"`);
  }
  return {
    title: top.trackName,
    artist: top.artistName ?? '',
    album: top.collectionName,
    artworkUrl: top.artworkUrl100,
    seedUrl: top.trackViewUrl,
  };
}
