import { z } from 'zod';

/**
 * The structured-action contract — Lar's spine.
 *
 * The voice agent ("Hey Lar"), the dispatcher, every connector, and any
 * Zapier/MCP layer ALL speak this one schema (see docs/02-music-architecture).
 * The brain emits a LarAction; the dispatcher executes it through the best
 * available rung (deep link → system control → official API → automation).
 *
 * Bright-line: this is a CONTROL contract. It describes *what to do and where*,
 * never audio, never streamed content.
 */

export const INTENTS = ['play', 'pause', 'next', 'queue', 'open', 'recommend'] as const;
export const DOMAINS = ['music', 'podcast', 'film', 'book', 'place', 'define'] as const;
export const ENTITY_TYPES = [
  'track',
  'artist',
  'album',
  'show',
  'movie',
  'episode',
  'location',
  'word',
] as const;

/** Platforms Lar can route to. `auto` = let the dispatcher pick from user prefs. */
export const PLATFORMS = [
  'auto',
  'spotify',
  'apple_music',
  'tidal',
  'youtube_music',
  'soundcloud',
  'deezer',
  'amazon_music',
] as const;

export const LarAction = z.object({
  intent: z.enum(INTENTS),
  domain: z.enum(DOMAINS),
  entity: z.object({
    type: z.enum(ENTITY_TYPES),
    query: z.string().min(1),
    /** ISRC / canonical id once resolved; null until then. */
    id: z.string().nullable().default(null),
  }),
  platform: z.enum(PLATFORMS).default('auto'),
  modifiers: z.array(z.string()).default([]),
  targetDevice: z.string().nullable().default(null),
  /** 0..1 — the brain's confidence; the conductor gates on this. */
  confidence: z.number().min(0).max(1).default(0),
});

export type LarAction = z.infer<typeof LarAction>;
export type Intent = (typeof INTENTS)[number];
export type Domain = (typeof DOMAINS)[number];
export type EntityType = (typeof ENTITY_TYPES)[number];
export type Platform = (typeof PLATFORMS)[number];

/** Throwing parse — use when the source must be valid. */
export function parseLarAction(input: unknown): LarAction {
  return LarAction.parse(input);
}

/** Non-throwing parse — use at trust boundaries (model output, network). */
export function safeParseLarAction(input: unknown) {
  return LarAction.safeParse(input);
}
