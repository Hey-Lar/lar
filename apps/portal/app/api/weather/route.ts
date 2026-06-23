import { NextResponse } from 'next/server';
import { resolveWeather } from '@lar/connector-weather';
import { authorize } from '../../../lib/authz';

/**
 * BRIGHT-LINE: Read-only, keyless, live public data.
 * Fetches current weather + 5-day forecast from Open-Meteo (no key, no token).
 * Lar never writes location or weather data anywhere.
 *
 * The Open-Meteo fetch happens HERE (server-side) so the browser only calls
 * same-origin /api/weather — the CSP connect-src list stays unchanged.
 *
 * Returns: { ok: true, snapshot: WeatherSnapshot }
 *       or { ok: false, error: string } on any error.
 */
export async function GET(req: Request) {
  const gate = authorize(req);
  if (!gate.ok) return gate.response;

  const q = new URL(req.url).searchParams.get('q')?.trim() || 'Lisbon';

  try {
    const snapshot = await resolveWeather(q);
    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    // Log detail server-side; return a friendly generic message rather than the
    // raw upstream error (forward-looking leak guard, matches /api/finance).
    console.error('[api/weather] resolve failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Weather is temporarily unavailable.' },
      { status: 500 },
    );
  }
}
