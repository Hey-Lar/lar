/**
 * Dictionary connector — high-level resolve: a LarAction in, a WordResolution out.
 * Query → seed (dictionaryapi.dev/Wiktionary, for the card) → outward links (pure, always total).
 *
 * Bright-line: read-only, keyless open-dictionary data; links only.
 * Lar shows definitions and routes outward — it never stores query history.
 */
import type { LarAction } from '@lar/shared';
import { lookupWord, type WordSeed, type WordSense } from './dictionaryapi.js';

export type { WordSense } from './dictionaryapi.js';

export type WordLink = 'wiktionary' | 'merriam_webster' | 'google';

export interface WordResolution {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  senses: WordSense[];
  links: Record<WordLink, string>;
}

/**
 * Pure: builds outward dictionary links from a WordSeed. No network — unit-testable.
 * Total — every WordLink is always present (typed as a full Record, not Partial).
 */
export function buildWordLinks(seed: WordSeed): Record<WordLink, string> {
  const enc = encodeURIComponent(seed.word);
  return {
    wiktionary: seed.sourceUrls[0] ?? `https://en.wiktionary.org/wiki/${enc}`,
    merriam_webster: `https://www.merriam-webster.com/dictionary/${enc}`,
    google: `https://www.google.com/search?q=define+${enc}`,
  };
}

export async function resolveWord(
  action: LarAction,
  fetchImpl: typeof fetch = fetch,
): Promise<WordResolution> {
  // Bright-line: read-only, keyless open-dictionary data; links only.
  const seed = await lookupWord(action.entity.query, fetchImpl);
  const links = buildWordLinks(seed);
  return {
    word: seed.word,
    ...(seed.phonetic ? { phonetic: seed.phonetic } : {}),
    ...(seed.audioUrl ? { audioUrl: seed.audioUrl } : {}),
    senses: seed.senses,
    links,
  };
}
