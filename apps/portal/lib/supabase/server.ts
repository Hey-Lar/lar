/**
 * Supabase SERVER client (Server Components / Route Handlers / Server Actions).
 * Next 15: `cookies()` is async — this helper is async too. The `setAll` try/catch is
 * intentional: Server Components can't write cookies; the middleware refreshes instead.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from './config';

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl()!, supabaseKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — safe to ignore; the middleware refreshes.
        }
      },
    },
  });
}
