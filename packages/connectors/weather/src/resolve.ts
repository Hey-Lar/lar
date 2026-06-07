/**
 * High-level resolver: city query -> WeatherSnapshot.
 *
 * Bright-line: read-only, keyless, live public data.
 * Lar reads to show; it never writes location or weather data anywhere.
 * No API key, no signup, no token required (Open-Meteo public API).
 */

import { geocode, fetchForecast } from './openmeteo.js';
import { weatherFromCode, type WeatherIcon } from './wmo.js';

export interface CurrentWeather {
  tempC: number;
  feelsLikeC: number;
  humidityPct: number;
  windKph: number;
  code: number;
  label: string;
  icon: WeatherIcon;
}

export interface DailyForecast {
  date: string;
  code: number;
  label: string;
  icon: WeatherIcon;
  maxC: number;
  minC: number;
}

export interface WeatherSnapshot {
  place: string;
  country: string;
  timezone: string;
  current: CurrentWeather;
  daily: DailyForecast[];
}

export async function resolveWeather(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WeatherSnapshot> {
  const place = await geocode(query, fetchImpl);
  const raw = await fetchForecast(place.latitude, place.longitude, fetchImpl);

  const desc = weatherFromCode(raw.current.weather_code);
  const current: CurrentWeather = {
    tempC: Math.round(raw.current.temperature_2m),
    feelsLikeC: Math.round(raw.current.apparent_temperature),
    humidityPct: Math.round(raw.current.relative_humidity_2m),
    windKph: Math.round(raw.current.wind_speed_10m),
    code: raw.current.weather_code,
    label: desc.label,
    icon: desc.icon,
  };

  // Build the daily array defensively, respecting noUncheckedIndexedAccess.
  // All four parallel arrays (time, weather_code, max, min) share the same
  // length — guard each element access explicitly.
  const daily: DailyForecast[] = [];
  const times = raw.daily.time;
  for (let i = 0; i < times.length; i++) {
    const date = times[i];
    const code = raw.daily.weather_code[i];
    const maxC = raw.daily.temperature_2m_max[i];
    const minC = raw.daily.temperature_2m_min[i];
    if (date === undefined || code === undefined || maxC === undefined || minC === undefined) {
      continue;
    }
    const dayDesc = weatherFromCode(code);
    daily.push({
      date,
      code,
      label: dayDesc.label,
      icon: dayDesc.icon,
      maxC: Math.round(maxC),
      minC: Math.round(minC),
    });
  }

  return {
    place: place.name,
    country: place.country,
    timezone: place.timezone,
    current,
    daily,
  };
}
