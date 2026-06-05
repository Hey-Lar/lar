import type { Platform } from '@lar/shared';

/**
 * Default platform priority — "you own the algorithm". In Phase 1 this is a
 * constant; once Supabase auth lands it comes from the user's `preferences`
 * row (RLS-protected), so each person's routing reflects their own choices.
 */
export const DEFAULT_PLATFORM_PRIORITY: Platform[] = [
  'spotify',
  'apple_music',
  'tidal',
  'youtube_music',
  'deezer',
  'amazon_music',
  'soundcloud',
];
