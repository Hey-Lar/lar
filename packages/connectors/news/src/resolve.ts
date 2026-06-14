/**
 * @lar/connector-news — pure route-outward to NEUTRAL news sources.
 *
 * The purest expression of HeyLar's thesis: we don't host, rank, or editorialise the
 * news — we route you OUTWARD to a curated set of neutral aggregators, primary wire
 * services, a bias-aware comparison view, and reference archives, for any topic. No
 * API, no key, no fetch → maximally robust + private. Lar stores nothing.
 *
 * Total + pure: `buildNewsLinks(topic)` never throws on content (it encodes the topic
 * into each source's search deep-link).
 */

export type NewsKind = 'aggregator' | 'wire' | 'bias-aware' | 'reference';

export interface NewsSource {
  id: string;
  label: string;
  kind: NewsKind;
  /** one-line reason this source belongs in a neutral, anti-lock-in set. */
  why: string;
  url: string;
}

interface SourceDef {
  id: string;
  label: string;
  kind: NewsKind;
  why: string;
  build: (encoded: string) => string;
}

const SOURCES: ReadonlyArray<SourceDef> = [
  {
    id: 'google-news',
    label: 'Google News',
    kind: 'aggregator',
    why: 'Broadest aggregation across outlets for a fast overview.',
    build: (q) => `https://news.google.com/search?q=${q}`,
  },
  {
    id: 'ground-news',
    label: 'Ground News',
    kind: 'bias-aware',
    why: 'Shows the same story across left / center / right — see the spread, not one slant.',
    build: (q) => `https://ground.news/search?q=${q}`,
  },
  {
    id: 'ap-news',
    label: 'AP News',
    kind: 'wire',
    why: 'A primary wire service — the reporting other outlets syndicate.',
    build: (q) => `https://apnews.com/search?q=${q}`,
  },
  {
    id: 'reuters',
    label: 'Reuters',
    kind: 'wire',
    why: 'A second primary wire service to cross-check the first.',
    build: (q) => `https://www.reuters.com/site-search/?query=${q}`,
  },
  {
    id: 'wikipedia',
    label: 'Wikipedia',
    kind: 'reference',
    why: 'Context + sourcing for the background behind a story.',
    build: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${q}`,
  },
  {
    id: 'archive',
    label: 'Internet Archive',
    kind: 'reference',
    why: 'Primary documents + history that outlast a news cycle.',
    build: (q) => `https://archive.org/search?query=${q}`,
  },
];

/** All neutral sources for a topic, encoded. Pure + total. */
export function buildNewsLinks(topic: string): NewsSource[] {
  const q = encodeURIComponent(topic.trim());
  return SOURCES.map((s) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    why: s.why,
    url: s.build(q),
  }));
}

/** Source ids, for tests + UI grouping. */
export const NEWS_SOURCE_IDS = SOURCES.map((s) => s.id);
