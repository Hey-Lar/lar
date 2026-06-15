/**
 * Server-side auth gate for Route Handlers / Server Components.
 *
 * Uses `getClaims()` (JWKS-verified locally) — NEVER `getSession()`, which doesn't
 * revalidate and must not be trusted in server code (per Supabase's explicit warning).
 * Fails CLOSED: returns 401 when there's no user OR when auth isn't configured yet, so
 * a route that opts into auth can never accidentally serve an unauthenticated request.
 */
import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from './config';
import { createClient } from './server';

export interface AuthedUser {
  id: string;
  email?: string;
}

export type RequireUserResult = { user: AuthedUser } | { response: NextResponse };

export async function requireUser(): Promise<RequireUserResult> {
  if (!isSupabaseConfigured()) {
    return { response: NextResponse.json({ error: 'auth not configured' }, { status: 401 }) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims || typeof claims.sub !== 'string') {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const email = typeof claims.email === 'string' ? claims.email : undefined;
  return { user: { id: claims.sub, email } };
}

/** Type guard: did `requireUser()` deny (carry a ready-to-return response)? */
export function isDenied(r: RequireUserResult): r is { response: NextResponse } {
  return 'response' in r;
}
