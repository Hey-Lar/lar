import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '../../../lib/supabase/config';
import { createClient } from '../../../lib/supabase/server';
import { safeNextPath } from '../../../lib/supabase/safe-redirect';

/**
 * /auth/confirm — the single sign-in landing route, provider-agnostic. Handles BOTH:
 *  - OAuth / PKCE `?code=` → exchangeCodeForSession. EVERY OAuth method lands here:
 *    Google, Apple, …, and the DEFAULT magic-link email (its link redirects with ?code).
 *  - Custom-template magic link `?token_hash=&type=` → verifyOtp.
 * Either path sets the session cookie (via the middleware refresh) and redirects on.
 *
 * No-op-safe: bounces to /login when auth isn't configured. Never leaks the token.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  // Post-sign-in destination. Same-origin paths ONLY (no open-redirect off `next`).
  const next = safeNextPath(searchParams.get('next'));

  const supabase = await createClient();

  // OAuth + PKCE (Google / Apple / …) and the default-email magic link all return a code.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // Custom email-template path: a hashed one-time token.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL('/login?error=link', origin));
}
