/**
 * Wikipedia REST API — free, no key. Turns a free-text film/TV query into a
 * seed (Wikipedia page URL + metadata) for downstream card rendering.
 *
 * Bright-line: metadata only. The Wikipedia data is used for the card (title,
 * description, thumbnail). Watch links are built separately and are purely
 * static — they do NOT depend on Wikipedia. Lar never hosts, streams, or sells
 * video content — it routes the user outward to JustWatch and streaming stores.
 */

const WIKI_SEARCH = 'https://en.wikipedia.org/w/rest.php/v1/search/page';

export interface FilmSeed {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  /** Canonical Wikipedia article URL for this title. */
  wikipediaUrl: string;
  /** The original user query — passed through for link building. */
  query: string;
}

interface WikiPage {
  key?: string;
  title?: string;
  description?: string;
  thumbnail?: { url?: string } | null;
}

export async function searchTitle(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FilmSeed> {
  const url = `${WIKI_SEARCH}?q=${encodeURIComponent(query)}&limit=1`;
  // Wikipedia REST requires a descriptive User-Agent to avoid 429 rate-limits
  // from anonymous requests. No key — just an identifier so Wikimedia can reach
  // us if there's a problem. See https://www.mediawiki.org/wiki/REST_API#Terms_and_conditions
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': 'Lar/1.0 (https://heylar.ai; amari@heylar.ai) connector-filmtv' },
  });
  if (!res.ok) throw new Error(`Wikipedia search failed: HTTP ${res.status}`);
  const data = (await res.json()) as { pages?: WikiPage[] };
  const page = data.pages?.[0];
  if (!page?.key || !page.title) {
    throw new Error(`No title found for "${query}"`);
  }
  // Wikipedia key (e.g. "Dune_(2021_film)") is already URL-safe — parens are
  // valid in wiki paths, so we do NOT encode them.
  const wikipediaUrl = `https://en.wikipedia.org/wiki/${page.key}`;

  // Thumbnail URLs from Wikipedia often come as protocol-relative ("//upload…").
  // Prefix with https: so they are absolute.
  let thumbnailUrl: string | undefined;
  if (page.thumbnail?.url) {
    const raw = page.thumbnail.url;
    thumbnailUrl = raw.startsWith('//') ? `https:${raw}` : raw;
  }

  return {
    title: page.title,
    description: page.description,
    thumbnailUrl,
    wikipediaUrl,
    query,
  };
}
