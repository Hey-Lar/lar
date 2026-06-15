/**
 * Supabase BROWSER client (client components). @supabase/ssr — the current pattern
 * (the old @supabase/auth-helpers-nextjs is deprecated). Only constructs when
 * configured; callers should guard with `isSupabaseConfigured()` first.
 */
import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from './config';

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured (set NEXT_PUBLIC_SUPABASE_URL + key).');
  }
  return createBrowserClient(supabaseUrl()!, supabaseKey()!);
}
