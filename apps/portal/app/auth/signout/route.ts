import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '../../../lib/supabase/config';
import { createClient } from '../../../lib/supabase/server';

/**
 * /auth/signout — POST to clear the session. The session cookies are httpOnly, so
 * sign-out must happen server-side. No-op-safe when auth is unconfigured.
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL('/login', origin), { status: 303 });
}
