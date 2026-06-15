/**
 * Supabase session refresh for the edge middleware — INTEGRATES with the app's existing
 * nonce-CSP middleware rather than replacing it. It takes the response the CSP
 * middleware already built and writes the refreshed Supabase auth cookies onto it.
 *
 * Two deliberate differences from the vanilla Supabase snippet:
 *  - **No redirect to /login.** The keyless app must keep working; per-route gating
 *    happens via `requireUser()`, not a blanket middleware redirect.
 *  - **No-op when unconfigured** — returns the response untouched, so the current
 *    keyless app is completely unaffected until auth is armed.
 */
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from './config';

export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(supabaseUrl()!, supabaseKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the session so the token refreshes + cookies are written. Do NOT run code
  // between createServerClient and getClaims() (a documented Supabase footgun).
  await supabase.auth.getClaims();

  return response;
}
