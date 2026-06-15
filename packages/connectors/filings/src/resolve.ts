/**
 * @lar/connector-filings — pure route-outward to NEUTRAL financial primary sources.
 *
 * The research-backed, compliant finance pattern: HeyLar never gives a verdict, a
 * ranking, or personalised advice. For a ticker it routes you OUTWARD to read the
 * PRIMARY SOURCE yourself — the company's own SEC filings + investor relations, a
 * neutral data view, and the official macro backdrop. Keyless, read-only, no fetch.
 *
 * BRIGHT-LINE: educational + route-outward only. No buy/sell, no "intrinsic value",
 * nothing personalised. Total + pure: never throws on content.
 */

export type SourceKind = 'primary' | 'reference' | 'macro';

export interface PrimarySource {
  id: string;
  label: string;
  kind: SourceKind;
  why: string;
  url: string;
}

interface SourceDef {
  id: string;
  label: string;
  kind: SourceKind;
  why: string;
  build: (encoded: string) => string;
}

const SOURCES: ReadonlyArray<SourceDef> = [
  {
    id: 'edgar',
    label: 'SEC EDGAR filings',
    kind: 'primary',
    why: "The company's own 10-K / 10-Q — the primary source, unfiltered.",
    build: (q) =>
      `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${q}&type=10-K&dateb=&owner=include&count=40`,
  },
  {
    id: 'ir',
    label: 'Investor Relations',
    kind: 'primary',
    why: 'Straight from the company — earnings, decks, releases.',
    build: (q) => `https://www.google.com/search?q=${q}%20investor%20relations`,
  },
  {
    id: 'yahoo',
    label: 'Yahoo Finance',
    kind: 'reference',
    why: 'Neutral quotes, financials, and filings in one view.',
    build: (q) => `https://finance.yahoo.com/quote/${q}`,
  },
  {
    id: 'fred',
    label: 'FRED (macro)',
    kind: 'macro',
    why: 'Official US economic data for the backdrop, from the Federal Reserve.',
    build: (q) => `https://fred.stlouisfed.org/searchresults?st=${q}`,
  },
];

/** All neutral primary/reference sources for a ticker or company. Pure + total. */
export function buildPrimarySourceLinks(symbolOrName: string): PrimarySource[] {
  const q = encodeURIComponent(symbolOrName.trim());
  return SOURCES.map((s) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    why: s.why,
    url: s.build(q),
  }));
}

export const PRIMARY_SOURCE_IDS = SOURCES.map((s) => s.id);
