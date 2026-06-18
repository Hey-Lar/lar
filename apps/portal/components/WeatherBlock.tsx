'use client';

/**
 * BRIGHT-LINE: read-only, keyless, live public data.
 * Fetches /api/weather (server-side Open-Meteo, no key, no token).
 * Lar reads to show — never writes, stores, or tracks location.
 * The browser ONLY calls same-origin /api/weather; Open-Meteo is
 * never contacted directly from the client (CSP connect-src unchanged).
 */

import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@lar/ui';
import type { WeatherSnapshot } from '@lar/connector-weather';

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekday(dateStr: string): string {
  // dateStr is YYYY-MM-DD (local date from the API, timezone=auto)
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return dateStr;
  const day = new Date(y, m - 1, d).getDay();
  return WEEKDAYS[day] ?? dateStr;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WeatherState {
  snapshot: WeatherSnapshot | null;
  loading: boolean;
  error: string | null;
}

const INITIAL: WeatherState = { snapshot: null, loading: true, error: null };

export function WeatherBlock() {
  const [city, setCity] = useState('Lisbon');
  const [inputCity, setInputCity] = useState('Lisbon');
  const [state, setState] = useState<WeatherState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  function fetchWeather(q: string) {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState({ snapshot: null, loading: true, error: null });

    fetch(`/api/weather?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: { ok: boolean; snapshot?: WeatherSnapshot; error?: string }) => {
        if (ctrl.signal.aborted) return;
        if (data.ok && data.snapshot) {
          setState({ snapshot: data.snapshot, loading: false, error: null });
        } else {
          setState({ snapshot: null, loading: false, error: data.error ?? 'Unknown error' });
        }
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ snapshot: null, loading: false, error: msg });
      });
  }

  // Fetch on mount
  useEffect(() => {
    fetchWeather('Lisbon');
    return () => {
      abortRef.current?.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputCity.trim();
    if (!q) return;
    setCity(q);
    fetchWeather(q);
  }

  const { snapshot, loading, error } = state;

  return (
    <div className="block-pad">
      {/* Header */}
      <div className="head">
        <div>
          <div className="eyebrow">Live · keyless</div>
          <h1 className="h1">Weather</h1>
        </div>
        <span className="badge live">OPEN-METEO</span>
      </div>

      <p className="lead">
        Live local weather, no account, no tracking — fetched server-side, read-only.
      </p>

      {/* City search bar */}
      <form className="ask" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputCity}
          onChange={(e) => setInputCity(e.target.value)}
          placeholder="City name…"
          aria-label="City name"
        />
        <button type="submit" className="go">
          Update
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="note" style={{ marginBottom: 18 }} role="status" aria-live="polite">
          Fetching weather for {city}…
        </div>
      )}

      {/* Current weather hero */}
      {snapshot && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            {/* Big icon + temp + label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginBottom: 18,
              }}
            >
              <span style={{ lineHeight: 1, color: 'var(--hearth)' }} aria-hidden>
                <Icon name={snapshot.current.icon as IconName} size={64} strokeWidth={1.5} />
              </span>
              <div>
                <div className="wx-temp">{snapshot.current.tempC}°</div>
                <div style={{ fontSize: 'var(--t-body-lg)', fontWeight: 600, marginTop: 4 }}>
                  {snapshot.current.label}
                </div>
                <div className="note" style={{ marginTop: 4 }}>
                  {snapshot.place}, {snapshot.country}
                </div>
              </div>
            </div>

            {/* Detail tiles row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              <div className="card">
                <div className="eyebrow">Feels like</div>
                <div className="tile-big">{snapshot.current.feelsLikeC}°</div>
              </div>
              <div className="card">
                <div className="eyebrow">Humidity</div>
                <div className="tile-big">{snapshot.current.humidityPct}%</div>
              </div>
              <div className="card">
                <div className="eyebrow">Wind</div>
                <div className="tile-big">{snapshot.current.windKph}</div>
                <div className="note">km/h</div>
              </div>
            </div>
          </div>

          {/* 5-day forecast */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 10,
              marginBottom: 14,
            }}
          >
            {snapshot.daily.map((day) => (
              <div key={day.date} className="card" style={{ textAlign: 'center' }}>
                <div className="eyebrow">{weekday(day.date)}</div>
                <div style={{ margin: '8px 0 4px', color: 'var(--ink-soft)' }} aria-hidden>
                  <Icon name={day.icon as IconName} size={28} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{day.maxC}°</div>
                <div className="note">{day.minC}°</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bright-line note */}
      <div className="note">
        Live data via Open-Meteo. Lar reads to show — read-only, no keys, no tracking.
      </div>
    </div>
  );
}
