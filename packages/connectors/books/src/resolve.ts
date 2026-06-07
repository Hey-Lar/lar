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
  links: Partial<Record<BookLink, string>>;
}

/** Pure: builds outward links from a seed. No network — unit-testable. */
export function buildBookLinks(seed: BookSeed): Partial<Record<BookLink, string>> {
  const q = seed.title + (seed.author ? ' ' + seed.author : '');
  const enc = encodeURIComponent(q);

  const links: Partial<Record<BookLink, string>> = {
    // The neutral, ownable artifact — like RSS for podcasts.
    open_library: seed.openLibraryUrl,
    // FIND IT IN A LIBRARY — the anti-lock-in, route-outward standout; libraries are free.
    library: `https://search.worldcat.org/search?q=${enc}`,
    apple_books: `https://books.apple.com/search?term=${enc}`,
    kindle: seed.isbn
      ? `https://www.amazon.com/dp/${seed.isbn}`
      : `https://www.amazon.com/s?k=${enc}&i=stripbooks`,
    kobo: `https://www.kobo.com/search?query=${enc}`,
    google_books: seed.isbn
      ? `https://books.google.com/books?vid=ISBN${seed.isbn}`
      : `https://www.google.com/search?tbm=bks&q=${enc}`,
  };

  return links;
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
