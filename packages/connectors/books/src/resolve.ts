/**
 * Books connector — high-level resolve: a LarAction in, a BookResolution out.
 * Query → seed (Open Library) → outward links (OL, library, retail stores).
 *
 * Bright-line: resolves + builds links only. Lar never hosts, streams, or
 * sells book content — it routes the user outward. Library-first framing.
 */
import type { LarAction } from '@lar/shared';
import { searchBook, type BookSeed } from './openlibrary.js';

export type BookLink =
  | 'open_library'
  | 'library'
  | 'apple_books'
  | 'kindle'
  | 'kobo'
  | 'google_books';

export interface BookResolution {
  title: string;
  author: string;
  year?: number;
  coverUrl?: string;
  isbn?: string;
  openLibraryUrl: string;
  links: Record<BookLink, string>;
}

/**
 * Pure: builds outward links from a seed. No network — unit-testable.
 * Total — every BookLink is always present (typed as a full Record, not Partial).
 */
export function buildBookLinks(seed: BookSeed): Record<BookLink, string> {
  const q = seed.title + (seed.author ? ' ' + seed.author : '');
  const enc = encodeURIComponent(q);
  // ISBNs from Open Library are bare digits + an optional trailing X, but encode
  // defensively so a hyphenated/spaced value can never break the path/query.
  const isbn = seed.isbn ? encodeURIComponent(seed.isbn) : undefined;

  return {
    // The neutral, ownable artifact — like RSS for podcasts.
    open_library: seed.openLibraryUrl,
    // FIND IT IN A LIBRARY — the anti-lock-in, route-outward standout; libraries are free.
    library: `https://search.worldcat.org/search?q=${enc}`,
    apple_books: `https://books.apple.com/search?term=${enc}`,
    kindle: isbn
      ? `https://www.amazon.com/dp/${isbn}`
      : `https://www.amazon.com/s?k=${enc}&i=stripbooks`,
    kobo: `https://www.kobo.com/search?query=${enc}`,
    google_books: isbn
      ? `https://books.google.com/books?vid=ISBN${isbn}`
      : `https://www.google.com/search?tbm=bks&q=${enc}`,
  };
}

export async function resolveBook(
  action: LarAction,
  fetchImpl: typeof fetch = fetch,
): Promise<BookResolution> {
  const seed = await searchBook(action.entity.query, fetchImpl);
  const links = buildBookLinks(seed);
  return {
    title: seed.title,
    author: seed.author,
    year: seed.year,
    coverUrl: seed.coverUrl,
    isbn: seed.isbn,
    openLibraryUrl: seed.openLibraryUrl,
    links,
  };
}
