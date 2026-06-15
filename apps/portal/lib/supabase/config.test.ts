import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from './config';

const KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

describe('supabase config guard', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('is NOT configured when env is empty (keeps the app keyless/inert)', () => {
    expect(isSupabaseConfigured()).toBe(false);
    expect(supabaseUrl()).toBeUndefined();
    expect(supabaseKey()).toBeUndefined();
  });

  it('is configured with URL + publishable key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_x';
    expect(isSupabaseConfigured()).toBe(true);
    expect(supabaseKey()).toBe('sb_publishable_x');
  });

  it('falls back to the legacy anon key name', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy_anon_x';
    expect(isSupabaseConfigured()).toBe(true);
    expect(supabaseKey()).toBe('legacy_anon_x');
  });

  it('prefers the publishable key over the legacy anon when both are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'pub';
    expect(supabaseKey()).toBe('pub');
  });

  it('needs BOTH a url and a key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    expect(isSupabaseConfigured()).toBe(false);
  });
});
