/**
 * Open-Meteo API client — keyless, read-only, public data.
 *
 * Bright-line: read-only, keyless, live public data.
 * No API key, no signup, no token required.
 * Lar never writes location or weather data anywhere.
 */

// ── Geocoding ─────────────────────────────────────────────────────────────────

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export interface GeoPlace {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface GeoResult {
  name?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface GeoResponse {
  results?: GeoResult[];
}

export async function geocode(query: string, fetchImpl: typeof fetch = fetch): Promise<GeoPlace> {
  const url = `${GEO_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo geocoding failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as GeoResponse;
  const r = data.results?.[0];
  if (!r) {
    throw new Error(`No place found for "${query}"`);
  }
  return {
    name: r.name ?? query,
    country: r.country ?? '',
    latitude: r.latitude ?? 0,
    longitude: r.longitude ?? 0,
    timezone: r.timezone ?? 'UTC',
  };
}

// ── Forecast ──────────────────────────────────────────────────────────────────

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export interface RawForecast {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  current_units: {
    temperature_2m: string;
    apparent_temperature: string;
    wind_speed_10m: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export async function fetchForecast(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch,
): Promise<RawForecast> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '5',
  });
  const url = `${FORECAST_URL}?${params.toString()}`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo forecast failed: HTTP ${res.status}`);
  }
  return (await res.json()) as RawForecast;
}
