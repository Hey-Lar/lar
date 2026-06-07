/**
 * WMO weather interpretation codes -> human label + a UI-agnostic icon name.
 * Pure map, no network, no side effects.
 *
 * `icon` is one of the `wx-*` icon names (plain strings, NOT emoji). The
 * connector stays UI-agnostic — it does not import `@lar/ui`; the portal casts
 * the string to an `IconName` at its boundary and renders `<Icon>`.
 *
 * Source: https://open-meteo.com/en/docs#weathervariables
 */

/** One of the weather sub-icon names in the `@lar/ui` registry. */
export type WeatherIcon =
  | 'wx-clear'
  | 'wx-partly'
  | 'wx-cloud'
  | 'wx-fog'
  | 'wx-drizzle'
  | 'wx-rain'
  | 'wx-snow'
  | 'wx-storm'
  | 'wx-unknown';

export interface WeatherDescription {
  label: string;
  icon: WeatherIcon;
}

const WMO_MAP: Record<number, WeatherDescription> = {
  0: { label: 'Clear sky', icon: 'wx-clear' },
  1: { label: 'Mainly clear', icon: 'wx-partly' },
  2: { label: 'Partly cloudy', icon: 'wx-partly' },
  3: { label: 'Overcast', icon: 'wx-cloud' },
  45: { label: 'Fog', icon: 'wx-fog' },
  48: { label: 'Icy fog', icon: 'wx-fog' },
  51: { label: 'Light drizzle', icon: 'wx-drizzle' },
  53: { label: 'Drizzle', icon: 'wx-drizzle' },
  55: { label: 'Dense drizzle', icon: 'wx-drizzle' },
  56: { label: 'Freezing drizzle', icon: 'wx-drizzle' },
  57: { label: 'Heavy freezing drizzle', icon: 'wx-drizzle' },
  61: { label: 'Slight rain', icon: 'wx-rain' },
  63: { label: 'Rain', icon: 'wx-rain' },
  65: { label: 'Heavy rain', icon: 'wx-rain' },
  66: { label: 'Freezing rain', icon: 'wx-rain' },
  67: { label: 'Heavy freezing rain', icon: 'wx-rain' },
  71: { label: 'Slight snow', icon: 'wx-snow' },
  73: { label: 'Snow', icon: 'wx-snow' },
  75: { label: 'Heavy snow', icon: 'wx-snow' },
  77: { label: 'Snow grains', icon: 'wx-snow' },
  80: { label: 'Slight rain showers', icon: 'wx-rain' },
  81: { label: 'Rain showers', icon: 'wx-rain' },
  82: { label: 'Violent rain showers', icon: 'wx-rain' },
  85: { label: 'Snow showers', icon: 'wx-snow' },
  86: { label: 'Heavy snow showers', icon: 'wx-snow' },
  95: { label: 'Thunderstorm', icon: 'wx-storm' },
  96: { label: 'Thunderstorm with hail', icon: 'wx-storm' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'wx-storm' },
};

const UNKNOWN: WeatherDescription = { label: 'Unknown', icon: 'wx-unknown' };

export function weatherFromCode(code: number): WeatherDescription {
  return WMO_MAP[code] ?? UNKNOWN;
}
