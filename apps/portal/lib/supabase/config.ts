/**
 * Supabase config — the single source for the env vars + a guard so the WHOLE app
 * stays keyless and working until auth is actually configured. Every Supabase code
 * path checks `isSupabaseConfigured()` first and no-ops / fails-closed when it's not.
 *
 * Reads `process.env` at CALL time (not module load) so it's testable and reflects the
 * runtime. Supports both the new **publishable** key name and the legacy **anon** name
 * — Supabase lets either fill the slot during the migration window.
 *
 * DRAFT: this is the auth foundation. It is INERT until Alberto sets the env vars
 * (`doppler login` → pull the Supabase keys) and reviews + arms it. See
 * docs/20-auth.md.
 */

export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** True only when both the URL and a publishable/anon key are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseKey());
}
