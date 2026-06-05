/**
 * The Music connector's high-level resolve: a LarAction in, a routed open-URL
 * out. Query → seed (iTunes) → cross-platform links (Odesli) → platform pick
 * (explicit wins, else user priority ∩ availability) → deep link.
 *
 * Bright-line: resolves + builds launch links ONLY. Never streams or proxies.
 */
import type { LarAction, Platform } from '@lar/shared';
import { searchTrack } from './itunes';
import { resolveOdesli } from './odesli';

export interface MusicPrefs {
  /** User's platform order — "you own the algorithm". */
  platformPriority?: Platform[];
}

export interface MusicResolution {
  title: string;
  artist: string;
  artworkUrl?: string;
  /** The platform we routed to, or 'odesli' if none of the user's were available. */
  chosenPlatform: Platform | 'odesli';
  /** The deep link to open. */
  openUrl: string;
  links: Partial<Record<Platform, string>>;
  odesliPageUrl: string;
}

const DEFAULT_PRIORITY: Platform[] = [
  'spotify',
  'apple_music',
  'tidal',
  'youtube_music',
  'deezer',
  'amazon_music',
  'soundcloud',
];

const isUrl = (s: string) => /^https?:\/\//i.test(s);

function firstAvailable(priority: Platform[], available: Platform[]): Platform | undefined {
  return priority.find((p) => available.includes(p)) ?? available[0];
}

/** Pure platform-selection logic (unit-tested independently). */
export function pickPlatform(
  requested: Platform,
  priority: Platform[],
  available: Platform[],
): Platform | 'odesli' {
  if (available.length === 0) return 'odesli';
  if (requested !== 'auto') {
    return available.includes(requested)
      ? requested
      : (firstAvailable(priority, available) ?? 'odesli');
  }
  return firstAvailable(priority, available) ?? 'odesli';
}

export async function resolveMusic(
  action: LarAction,
  prefs: MusicPrefs = {},
  fetchImpl: typeof fetch = fetch,
): Promise<MusicResolution> {
  // 1. seed: a URL resolves directly; free text goes through iTunes search.
  let seedUrl: string;
  let seedMeta: { title?: string; artist?: string; artworkUrl?: string } = {};
  if (isUrl(action.entity.query)) {
    seedUrl = action.entity.query;
  } else {
    const seed = await searchTrack(action.entity.query, fetchImpl);
    seedUrl = seed.seedUrl;
    seedMeta = { title: seed.title, artist: seed.artist, artworkUrl: seed.artworkUrl };
  }

  // 2. cross-platform links
  const resolved = await resolveOdesli(seedUrl, fetchImpl);

  // 3. pick platform + build the open-URL
  const available = Object.keys(resolved.links) as Platform[];
  const chosen = pickPlatform(
    action.platform,
    prefs.platformPriority ?? DEFAULT_PRIORITY,
    available,
  );
  const openUrl =
    chosen === 'odesli'
      ? resolved.odesliPageUrl
      : (resolved.links[chosen] ?? resolved.odesliPageUrl);

  return {
    title: resolved.title ?? seedMeta.title ?? action.entity.query,
    artist: resolved.artist ?? seedMeta.artist ?? '',
    artworkUrl: resolved.artworkUrl ?? seedMeta.artworkUrl,
    chosenPlatform: chosen,
    openUrl,
    links: resolved.links,
    odesliPageUrl: resolved.odesliPageUrl,
  };
}
