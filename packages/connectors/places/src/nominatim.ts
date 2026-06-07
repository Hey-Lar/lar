/**
 * Nominatim (OpenStreetMap) geocoding client — keyless, read-only, open data.
 *
 * Bright-line: geocoding metadata only. Lar uses these coordinates to build
 * outward map links. It never embeds map tiles, never stores the user's
 * location, and never transmits coordinates beyond building the static links.
 *
 * Nominatim requires a descriptive User-Agent (like Wikimedia REST) to avoid
 * abuse-blocking. No key, no signup — just an identifier so OSM can reach us
 * if there's a problem. See https://nominatim.org/release-docs/develop/api/Search/
 */

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

/** The User-Agent required by Nominatim's usage policy (not a secret). */
const USER_AGENT = 'Lar/0.1 (heylar.ai; personal control surface)';

export interface PlaceSeed {
  name: string;
  address: string;
  lat: number;
  lon: number;
  category: string;
  type: string;
}

interface NominatimResult {
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
}

export async function searchPlace(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PlaceSeed> {
  const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(query)}&format=jsonv2&limit=1&addressdetails=1`;
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Nominatim search failed: HTTP ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  const r = data[0];
  if (!r) throw new Error(`No place found for "${query}"`);

  // lat/lon come as strings from Nominatim — parse to numbers and guard against
  // non-finite values. Defaulting to 0,0 would silently point to the Gulf of Guinea.
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!isFinite(lat) || !isFinite(lon)) {
    throw new Error(`No place found for "${query}"`);
  }

  // Nominatim may return an empty `name` for some address-only results; fall
  // back to the first segment of `display_name` (the most specific part).
  const name =
    r.name?.trim() || (r.display_name ? (r.display_name.split(',')[0]?.trim() ?? query) : query);

  return {
    name,
    address: r.display_name ?? '',
    lat,
    lon,
    category: r.category ?? '',
    type: r.type ?? '',
  };
}
