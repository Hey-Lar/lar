import { describe, it, expect, vi } from 'vitest';
import { parseLarAction } from '@lar/shared';
import { buildMapLinks, resolvePlace } from './resolve.js';
import type { PlaceSeed } from './nominatim.js';

function jsonRes(payload: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => payload } as Response;
}

/** Fake fetch routed by URL substring: [matchSubstring, payload][]. */
function fakeFetch(routes: Array<[string, unknown, boolean?, number?]>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [match, payload, ok = true, status = 200] of routes) {
      if (url.includes(match)) return jsonRes(payload, ok, status);
    }
    throw new Error(`no fake route for ${url}`);
  }) as unknown as typeof fetch;
}

// Nominatim returns lat/lon as STRINGS
const nominatimPayload = [
  {
    name: 'Time Out Market Lisboa',
    display_name: 'Time Out Market Lisboa, Avenida 24 de Julho, Lisboa, Portugal',
    lat: '38.7073',
    lon: '-9.1450',
    category: 'leisure',
    type: 'food_court',
  },
];

const action = parseLarAction({
  intent: 'open',
  domain: 'place',
  entity: { type: 'location', query: 'Time Out Market Lisbon' },
});

const seed: PlaceSeed = {
  name: 'Time Out Market Lisboa',
  address: 'Time Out Market Lisboa, Avenida 24 de Julho, Lisboa, Portugal',
  lat: 38.7073,
  lon: -9.145,
  category: 'leisure',
  type: 'food_court',
};

// ── buildMapLinks ─────────────────────────────────────────────────────────────

describe('buildMapLinks', () => {
  it('always includes all 5 map links', () => {
    const links = buildMapLinks(seed);
    expect(links['openstreetmap']).toBeTruthy();
    expect(links['google_maps']).toBeTruthy();
    expect(links['apple_maps']).toBeTruthy();
    expect(links['waze']).toBeTruthy();
    expect(links['directions']).toBeTruthy();
  });

  it('OSM link uses mlat/mlon params and #map fragment', () => {
    const links = buildMapLinks(seed);
    expect(links['openstreetmap']).toContain('openstreetmap.org');
    expect(links['openstreetmap']).toContain('mlat=38.7073');
    expect(links['openstreetmap']).toContain('mlon=-9.145');
    expect(links['openstreetmap']).toContain('#map=17/');
  });

  it('google_maps link embeds lat,lon as query param', () => {
    const links = buildMapLinks(seed);
    expect(links['google_maps']).toContain('google.com/maps');
    // lat,lon encoded in the query param
    expect(links['google_maps']).toContain(encodeURIComponent('38.7073,-9.145'));
  });

  it('apple_maps link embeds ll= and q= params', () => {
    const links = buildMapLinks(seed);
    expect(links['apple_maps']).toContain('maps.apple.com');
    expect(links['apple_maps']).toContain('ll=');
    expect(links['apple_maps']).toContain('q=');
  });

  it('waze link embeds ll= param', () => {
    const links = buildMapLinks(seed);
    expect(links['waze']).toContain('waze.com');
    expect(links['waze']).toContain('ll=');
  });

  it('directions link embeds destination= with lat,lon', () => {
    const links = buildMapLinks(seed);
    expect(links['directions']).toContain('google.com/maps');
    expect(links['directions']).toContain('destination=');
    expect(links['directions']).toContain(encodeURIComponent('38.7073,-9.145'));
  });

  it('name is URL-encoded in apple_maps q param', () => {
    const s: PlaceSeed = { ...seed, name: 'Time Out & Market Lisbon' };
    const links = buildMapLinks(s);
    expect(links['apple_maps']).toContain(encodeURIComponent('Time Out & Market Lisbon'));
    expect(links['apple_maps']).not.toContain('Time Out & Market');
  });

  it('coords are present as raw numbers in OSM link (not encoded)', () => {
    const links = buildMapLinks(seed);
    expect(links['openstreetmap']).toContain('38.7073');
    expect(links['openstreetmap']).toContain('-9.145');
  });
});

// ── resolvePlace ──────────────────────────────────────────────────────────────

describe('resolvePlace', () => {
  it('resolves name, address, lat, lon (parsed from string), category, type, and all 5 links', async () => {
    const fetchImpl = fakeFetch([['nominatim.openstreetmap.org', nominatimPayload]]);
    const r = await resolvePlace(action, fetchImpl);
    expect(r.name).toBe('Time Out Market Lisboa');
    expect(r.address).toContain('Lisboa');
    expect(r.lat).toBe(38.7073);
    expect(r.lon).toBe(-9.145);
    expect(r.category).toBe('leisure');
    expect(r.type).toBe('food_court');
    // All 5 links present
    expect(r.links['openstreetmap']).toContain('openstreetmap.org');
    expect(r.links['google_maps']).toContain('google.com/maps');
    expect(r.links['apple_maps']).toContain('maps.apple.com');
    expect(r.links['waze']).toContain('waze.com');
    expect(r.links['directions']).toContain('google.com/maps');
    // lat/lon are finite numbers (parsed from Nominatim's string format)
    expect(isFinite(r.lat)).toBe(true);
    expect(isFinite(r.lon)).toBe(true);
  });

  it('rejects when Nominatim returns an empty array (no place found)', async () => {
    const emptyFetch = fakeFetch([['nominatim.openstreetmap.org', []]]);
    await expect(resolvePlace(action, emptyFetch)).rejects.toThrow('No place found');
  });

  it('rejects when lat/lon are non-finite (e.g. "NaN" or missing)', async () => {
    const badPayload = [
      {
        name: 'Nowhere',
        display_name: 'Nowhere',
        lat: 'NaN',
        lon: 'NaN',
        category: 'place',
        type: 'locality',
      },
    ];
    const fetchImpl = fakeFetch([['nominatim.openstreetmap.org', badPayload]]);
    await expect(resolvePlace(action, fetchImpl)).rejects.toThrow('No place found');
  });

  it('rejects with HTTP error message when Nominatim returns non-2xx', async () => {
    const errorFetch = vi.fn(async () => jsonRes({}, false, 500)) as unknown as typeof fetch;
    await expect(resolvePlace(action, errorFetch)).rejects.toThrow('HTTP 500');
  });

  it('falls back to first display_name segment when name is empty', async () => {
    const noNamePayload = [
      {
        name: '',
        display_name: 'Rua Augusta, Lisboa, Portugal',
        lat: '38.71',
        lon: '-9.14',
        category: 'highway',
        type: 'pedestrian',
      },
    ];
    const fetchImpl = fakeFetch([['nominatim.openstreetmap.org', noNamePayload]]);
    const r = await resolvePlace(action, fetchImpl);
    expect(r.name).toBe('Rua Augusta');
  });

  // Live end-to-end (no key, just User-Agent). Run with: LAR_LIVE=1 npx vitest run
  it.skipIf(process.env['LAR_LIVE'] !== '1')(
    'resolves Time Out Market Lisbon live (Nominatim)',
    async () => {
      const r = await resolvePlace(
        parseLarAction({
          intent: 'open',
          domain: 'place',
          entity: { type: 'location', query: 'Time Out Market Lisbon' },
        }),
      );
      expect(r.links['openstreetmap']).toContain('openstreetmap.org');
      expect(isFinite(r.lat)).toBe(true);
      expect(isFinite(r.lon)).toBe(true);
      expect(r.name.length).toBeGreaterThan(0);
    },
    20000,
  );
});
