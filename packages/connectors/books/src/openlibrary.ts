/**
 * Open Library Search API — free, no key. Turns a free-text query into a book
 * seed (Open Library work URL + metadata) for downstream link building.
 *
 * Bright-line: metadata + outward links only. Lar never hosts, streams, or
 * sells book content — it routes the user to Open Library, libraries, and
 * retail stores.
 */

const OL_SEARCH = 'https://openlibrary.org/search.json';

export interface BookSeed {
  title: string;
  author: string;
  year?: number;
  coverUrl?: string;
  isbn?: string;
  /** Canonical Open Library work page — the neutral, ownable artifact. */
  openLibraryUrl: string;
}

interface OLDoc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  key?: string;
  isbn?: string[];
}

export async function searchBook(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BookSeed> {
  const url = `${OL_SEARCH}?q=${encodeURIComponent(query)}&limit=1&fields=title,author_name,first_publish_year,cover_i,key,isbn`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Open Library search failed: HTTP ${res.status}`);
  const data = (await res.json()) as { docs?: OLDoc[] };
  const doc = data.docs?.[0];
  if (!doc?.key || !doc.title) {
    throw new Error(`No book found for "${query}"`);
  }
  return {
    title: doc.title,
    author: doc.author_name?.[0] ?? '',
    year: doc.first_publish_year,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
    isbn: doc.isbn?.[0],
    openLibraryUrl: `https://openlibrary.org${doc.key}`,
  };
}
