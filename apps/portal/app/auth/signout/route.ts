import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '../../../lib/supabase/config';
import { createClient } from '../../../lib/supabase/server';

/**
 * /auth/signout — POST to clear the session. The session cookies are httpOnly, so
 * sign-out must happen server-side. No-op-safe when auth is unconfigured.
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  // CSRF defense-in-depth (on top of SameSite=Lax cookies): a cross-site page must not
  // be able to force a sign-out. Reject when the Origin header is present and mismatched.
  const reqOrigin = request.headers.get('origin');
  if (reqOrigin && reqOrigin !== origin) {
    return NextResponse.json({ error: 'cross-origin' }, { status: 403 });
  }
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL('/login', origin), { status: 303 });
}
