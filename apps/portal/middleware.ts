import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from './lib/supabase/middleware';

/**
 * Edge middleware: security headers (Nosecone-style) + per-request CSP
 * nonce. Defense-in-depth alongside `lib/authz.ts` — the V2 plan's §E
 * explicitly warns NOT to rely on middleware for authz (compiled Server
 * Actions / Route Handlers bypass it), so this layer focuses on transport
 * + browser-side concerns instead: CSP, HSTS, frame-ancestors, MIME
 * sniffing, referrer leakage, opt-out from unnecessary features.
 *
 * Tactic: generate a fresh base64 nonce per request, attach it to the
 * incoming request in TWO places and to the response's CSP header:
 *   1. `x-nonce` — so `layout.tsx` can read it via `headers()` and stamp
 *      our inline <style>/<script> tags.
 *   2. `Content-Security-Policy` on the REQUEST — Next.js reads this to
 *      derive the nonce for ITS OWN framework <script> tags. Without it,
 *      Next mints a different nonce than our `x-nonce`, the response CSP
 *      only whitelists one of the two, and the browser blocks the other
 *      inline tags. (Symptom: the themeCss <style> is present but inert —
 *      `style.sheet === null` — so every theme variable resolves empty and
 *      all accent CTAs + glass/mesh vanish.) Setting the CSP on the request
 *      is the documented Next.js nonce contract; keep both in lockstep.
 * The pre-hydration theme-boot script + the themeCss <style> are the
 * only two inline elements we own — everything else is bundled or fetched
 * from a same-origin allow-list.
 */

const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
// iTunes / Apple Podcasts artwork (used by MusicBlock + PodcastsBlock).
const IMAGE_HOSTS = ['https://*.mzstatic.com'];
// Cross-platform link resolver (Odesli) for the music wedge.
const FETCH_HOSTS = ['https://api.song.link', 'https://itunes.apple.com'];

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  // Next dev needs 'unsafe-eval' for HMR. Strip it in prod.
  const scriptExtras = isDev ? "'unsafe-eval'" : '';
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' ${scriptExtras}`.trim(),
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' ${FONT_HOSTS[0]}`,
    `img-src 'self' blob: data: ${IMAGE_HOSTS.join(' ')}`,
    `font-src 'self' ${FONT_HOSTS[1]}`,
    `connect-src 'self' ${FETCH_HOSTS.join(' ')}`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `manifest-src 'self'`,
    `worker-src 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

function setSecurityHeaders(res: NextResponse, csp: string): void {
  res.headers.set('Content-Security-Policy', csp);
  // Two-year HSTS with preload — production-safe; harmless on localhost.
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'no-referrer');
  // Music wedge needs the mic for Web Speech API; everything else off.
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), payment=(), usb=()',
  );
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  res.headers.set('Origin-Agent-Cluster', '?1');
  // Surfaces the kill-switch state for ops dashboards without leaking secrets.
  if (process.env.LAR_KILL_SWITCH === '1') {
    res.headers.set('X-Lar-Kill-Switch', '1');
  }
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  // base64(random UUID) — short, URL-safe enough for an HTTP header value.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-nonce', nonce);
  // Next.js reads the request-side CSP to nonce its own framework scripts —
  // this MUST carry the same nonce as the response CSP or inline tags break.
  reqHeaders.set('Content-Security-Policy', csp);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  setSecurityHeaders(res, csp);

  // Refresh the Supabase auth session on this SAME response (writes auth cookies,
  // never touches the CSP/nonce headers above). A pure no-op until auth is armed,
  // so the keyless app — and the CSP contract — behave exactly as before. There is
  // deliberately NO redirect-to-/login here; per-route gating is `requireUser()`.
  return refreshSession(req, res);
}

export const config = {
  // Skip Next's static asset routes — they don't need a per-request nonce
  // and re-injecting headers would defeat their long-cache pattern.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
