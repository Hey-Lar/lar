import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '../../../lib/supabase/config';
import { createClient } from '../../../lib/supabase/server';

/**
 * /auth/confirm — lands here from the magic-link email. Verifies the one-time token
 * SERVER-SIDE (verifyOtp), which sets the session cookie via the middleware refresh,
 * then redirects home. The canonical @supabase/ssr pattern: the email template points
 * at this route with `{{ .TokenHash }}` (see docs/20-auth.md → arming checklist).
 *
 * No-op-safe: if auth isn't configured, just bounce to /login. Never leaks the token.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL('/', origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=link', origin));
}
