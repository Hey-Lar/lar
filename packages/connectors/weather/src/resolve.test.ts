import { describe, it, expect, vi } from 'vitest';
import { weatherFromCode } from './wmo.js';
import { resolveWeather } from './resolve.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonRes(payload: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => payload } as Response;
}

/** Fake fetch routed by URL substring: [matchSubstring, payload, ok?, status?][]. */
function fakeFetch(routes: Array<[string, unknown, boolean?, number?]>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [match, payload, ok = true, status = 200] of routes) {
      if (url.includes(match)) return jsonRes(payload, ok, status);
    }
    throw new Error(`no fake route for ${url}`);
  }) as unknown as typeof fetch;
}

// ── Shared mock payloads ──────────────────────────────────────────────────────

const geoPayload = {
  results: [
    {
      name: 'Lisbon',
      country: 'Portugal',
      latitude: 38.717,
      longitude: -9.133,
      timezone: 'Europe/Lisbon',
    },
  ],
};

const forecastPayload = {
  current: {
    time: '2026-06-07T12:00',
    temperature_2m: 22.6,
    relative_humidity_2m: 65,
    apparent_temperature: 21.3,
    weather_code: 2,
    wind_speed_10m: 14.4,
  },
  current_units: {
    temperature_2m: '°C',
    apparent_temperature: '°C',
    wind_speed_10m: 'km/h',
  },
  daily: {
    time: ['2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11'],
    weather_code: [2, 3, 61, 80, 1],
    temperature_2m_max: [24.5, 22.1, 19.8, 21.0, 25.3],
    temperature_2m_min: [16.2, 15.8, 14.1, 15.5, 17.0],
  },
};

// ── weatherFromCode ───────────────────────────────────────────────────────────

describe('weatherFromCode', () => {
  it('returns clear for code 0', () => {
    const r = weatherFromCode(0);
    expect(r.label).toBe('Clear sky');
    expect(r.icon).toBe('☀️');
  });

  it('returns partly cloudy for code 2', () => {
    const r = weatherFromCode(2);
    expect(r.label).toBe('Partly cloudy');
    expect(r.icon).toBe('⛅');
  });

  it('returns rain for code 63', () => {
    const r = weatherFromCode(63);
    expect(r.label).toBe('Rain');
    expect(r.icon).toBe('🌧️');
  });

  it('returns snow for code 73', () => {
    const r = weatherFromCode(73);
    expect(r.label).toBe('Snow');
    expect(r.icon).toBe('🌨️');
  });

  it('returns thunderstorm for code 95', () => {
    const r = weatherFromCode(95);
    expect(r.label).toBe('Thunderstorm');
    expect(r.icon).toBe('⛈️');
  });

  it('returns thunderstorm with hail for code 96', () => {
    const r = weatherFromCode(96);
    expect(r.label).toContain('Thunderstorm');
    expect(r.icon).toBe('⛈️');
  });

  it('returns unknown for unrecognised code', () => {
    const r = weatherFromCode(999);
    expect(r.label).toBe('Unknown');
    expect(r.icon).toBe('❓');
  });
});

// ── resolveWeather ────────────────────────────────────────────────────────────

describe('resolveWeather', () => {
  it('returns place, country and timezone from geocoding', async () => {
    const fetchImpl = fakeFetch([
      ['geocoding-api', geoPayload],
      ['api.open-meteo.com', forecastPayload],
    ]);
    const snap = await resolveWeather('Lisbon', fetchImpl);
    expect(snap.place).toBe('Lisbon');
    expect(snap.country).toBe('Portugal');
    expect(snap.timezone).toBe('Europe/Lisbon');
  });

  it('maps current weather: rounded temp, label and icon from code', async () => {
    const fetchImpl = fakeFetch([
      ['geocoding-api', geoPayload],
      ['api.open-meteo.com', forecastPayload],
    ]);
    const snap = await resolveWeather('Lisbon', fetchImpl);
    // temperature_2m: 22.6 → rounds to 23
    expect(snap.current.tempC).toBe(23);
    // apparent_temperature: 21.3 → rounds to 21
    expect(snap.current.feelsLikeC).toBe(21);
    // relative_humidity_2m: 65
    expect(snap.current.humidityPct).toBe(65);
    // wind_speed_10m: 14.4 → rounds to 14
    expect(snap.current.windKph).toBe(14);
    // weather_code 2 → Partly cloudy
    expect(snap.current.label).toBe('Partly cloudy');
    expect(snap.current.icon).toBe('⛅');
  });

  it('builds daily array with length 5', async () => {
    const fetchImpl = fakeFetch([
      ['geocoding-api', geoPayload],
      ['api.open-meteo.com', forecastPayload],
    ]);
    const snap = await resolveWeather('Lisbon', fetchImpl);
    expect(snap.daily.length).toBe(5);
  });

  it('maps a daily entry correctly (label, icon, max, min)', async () => {
    const fetchImpl = fakeFetch([
      ['geocoding-api', geoPayload],
      ['api.open-meteo.com', forecastPayload],
    ]);
    const snap = await resolveWeather('Lisbon', fetchImpl);
    // day[0]: code=2 (Partly cloudy), max=24.5→25, min=16.2→16
    const d0 = snap.daily[0]!;
    expect(d0.date).toBe('2026-06-07');
    expect(d0.label).toBe('Partly cloudy');
    expect(d0.icon).toBe('⛅');
    expect(d0.maxC).toBe(25);
    expect(d0.minC).toBe(16);
    // day[2]: code=61 (Slight rain)
    const d2 = snap.daily[2]!;
    expect(d2.label).toBe('Slight rain');
    expect(d2.icon).toBe('🌧️');
  });

  it('rejects with "No place found" when geocoding returns no results', async () => {
    const fetchImpl = fakeFetch([
      ['geocoding-api', { results: [] }],
      ['api.open-meteo.com', forecastPayload],
    ]);
    await expect(resolveWeather('XYZNonexistent', fetchImpl)).rejects.toThrow('No place found');
  });

  it('rejects with "HTTP 500" on forecast server error', async () => {
    const fetchImpl = fakeFetch([
      ['geocoding-api', geoPayload],
      // api.open-meteo.com returns 500
      ['api.open-meteo.com', {}, false, 500],
    ]);
    await expect(resolveWeather('Lisbon', fetchImpl)).rejects.toThrow('HTTP 500');
  });

  it('rejects with "HTTP 500" on geocoding server error', async () => {
    const fetchImpl = fakeFetch([['geocoding-api', {}, false, 500]]);
    await expect(resolveWeather('Lisbon', fetchImpl)).rejects.toThrow('HTTP 500');
  });

  // Live end-to-end (no key). Run with: LAR_LIVE=1 npx vitest run
  it.skipIf(process.env['LAR_LIVE'] !== '1')(
    'resolves Lisbon live (Open-Meteo, keyless)',
    async () => {
      const snap = await resolveWeather('Lisbon');
      expect(Number.isFinite(snap.current.tempC)).toBe(true);
      expect(snap.daily.length).toBeGreaterThanOrEqual(1);
      expect(snap.place.length).toBeGreaterThan(0);
    },
    30000,
  );
});
