/**
 * Odesli / Songlink — free, no key. Given a seed URL on any one platform,
 * returns the same track's links on every other platform (rung 1: deep link).
 */
import type { Platform } from '@lar/shared';

const ODESLI = 'https://api.song.link/v1-alpha.1/links';

/** Odesli's camelCase platform keys → Lar's Platform enum. */
const PLATFORM_KEY_MAP: Record<string, Platform> = {
  spotify: 'spotify',
  appleMusic: 'apple_music',
  youtubeMusic: 'youtube_music',
  tidal: 'tidal',
  soundcloud: 'soundcloud',
  deezer: 'deezer',
  amazonMusic: 'amazon_music',
};

export interface ResolvedLinks {
  odesliPageUrl: string;
  links: Partial<Record<Platform, string>>;
  title?: string;
  artist?: string;
  artworkUrl?: string;
}

interface OdesliResponse {
  entityUniqueId: string;
  pageUrl: string;
  linksByPlatform?: Record<string, { url?: string } | undefined>;
  entitiesByUniqueId?: Record<
    string,
    { title?: string; artistName?: string; thumbnailUrl?: string } | undefined
  >;
}

export async function resolveOdesli(
  seedUrl: string,
  fetchImpl: typeof fetch = fetch,
  country = 'US',
): Promise<ResolvedLinks> {
  const url = `${ODESLI}?url=${encodeURIComponent(seedUrl)}&userCountry=${country}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Odesli failed: HTTP ${res.status}`);
  const data = (await res.json()) as OdesliResponse;

  const links: Partial<Record<Platform, string>> = {};
  for (const [key, val] of Object.entries(data.linksByPlatform ?? {})) {
    const platform = PLATFORM_KEY_MAP[key];
    if (platform && val?.url) links[platform] = val.url;
  }

  const entity = data.entitiesByUniqueId?.[data.entityUniqueId];
  return {
    odesliPageUrl: data.pageUrl,
    links,
    title: entity?.title,
    artist: entity?.artistName,
    artworkUrl: entity?.thumbnailUrl,
  };
}
