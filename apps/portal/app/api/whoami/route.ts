import { NextResponse } from 'next/server';
import { requireUser, isDenied } from '../../../lib/supabase/auth';

/**
 * Demonstrates the auth seam: returns the signed-in user, or 401. While auth is a
 * DRAFT (Supabase env unset), this fails closed with 401 — proving routes that opt
 * into `requireUser()` can never serve an unauthenticated request. The keyless Rooms
 * do NOT use this; they stay on the `personal` authz policy.
 */
export async function GET() {
  const result = await requireUser();
  if (isDenied(result)) return result.response;
  return NextResponse.json({ ok: true, user: result.user });
}
