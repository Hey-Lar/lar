/**
 * Places connector — high-level resolve: a LarAction in, a PlaceResolution out.
 * Query → seed (Nominatim, for the card) → outward map links (pure, always total).
 *
 * Bright-line: links only, Lar never embeds map tiles, never stores or transmits
 * the user's location. OSM-neutral-first framing: OpenStreetMap leads so the user
 * is not locked in to any commercial map provider.
 */
import type { LarAction } from '@lar/shared';
import { searchPlace, type PlaceSeed } from './nominatim.js';

export type MapLink = 'openstreetmap' | 'google_maps' | 'apple_maps' | 'waze' | 'directions';

export interface PlaceResolution {
  name: string;
  address: string;
  lat: number;
  lon: number;
  category: string;
  type: string;
  links: Record<MapLink, string>;
}

/**
 * Pure: builds outward map links from a PlaceSeed. No network — unit-testable.
 * Total — every MapLink is always present (typed as a full Record, not Partial).
 *
 * OpenStreetMap is the neutral open-data standout and leads the set. All others
 * are outward routes only — Lar never embeds tiles or stores coordinates.
 */
export function buildMapLinks(seed: PlaceSeed): Record<MapLink, string> {
  const ll = `${seed.lat},${seed.lon}`;
  const enc = encodeURIComponent(seed.name);
  return {
    // THE neutral open-data map — no commercial lock-in, leads the set.
    openstreetmap: `https://www.openstreetmap.org/?mlat=${seed.lat}&mlon=${seed.lon}#map=17/${seed.lat}/${seed.lon}`,
    google_maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ll)}`,
    apple_maps: `https://maps.apple.com/?ll=${encodeURIComponent(ll)}&q=${enc}`,
    waze: `https://waze.com/ul?ll=${encodeURIComponent(ll)}&navigate=yes`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ll)}`,
  };
}

export async function resolvePlace(
  action: LarAction,
  fetchImpl: typeof fetch = fetch,
): Promise<PlaceResolution> {
  // Bright-line: builds links only, Lar never embeds map tiles, never stores
  // or transmits the user's location beyond building these static outward links.
  const seed = await searchPlace(action.entity.query, fetchImpl);
  const links = buildMapLinks(seed);
  return {
    name: seed.name,
    address: seed.address,
    lat: seed.lat,
    lon: seed.lon,
    category: seed.category,
    type: seed.type,
    links,
  };
}
