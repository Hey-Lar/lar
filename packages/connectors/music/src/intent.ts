/**
 * Deterministic intent parser — the keyless "local model" stand-in.
 *
 * Per docs/02 §4, a small on-device model handles wake + common intents,
 * escalating to a cloud model only for ambiguity. This rule-based parser is
 * that local rung: it turns a transcript into a LarAction with zero network
 * and zero key, so the Music wedge works on day one. The portal escalates to
 * the Claude API only when this returns low confidence (see apps/portal).
 */
import type { Domain, EntityType, Intent, LarAction, Platform } from '@lar/shared';
import { parseLarAction } from '@lar/shared';

const PLATFORM_ALIASES: Array<[RegExp, Platform]> = [
  [/\bapple ?music\b|\bapple\b/, 'apple_music'],
  [/\byoutube ?music\b|\byoutube\b|\byt\b/, 'youtube_music'],
  [/\bamazon ?music\b|\bamazon\b/, 'amazon_music'],
  [/\bspotify\b/, 'spotify'],
  [/\btidal\b/, 'tidal'],
  [/\bsoundcloud\b/, 'soundcloud'],
  [/\bdeezer\b/, 'deezer'],
];

const MODIFIERS = [
  'calm',
  'chill',
  'relaxing',
  'upbeat',
  'energetic',
  'sad',
  'happy',
  'focus',
  'romantic',
  'workout',
  'sleep',
  'party',
  'explicit',
];

const FILLERS = [
  'on',
  'something',
  'some',
  'a',
  'an',
  'the',
  'please',
  'for me',
  'music',
  'track',
  'song',
  'tune',
  'tunes',
  'to',
];

const ENTITY_FOR_DOMAIN: Record<Domain, EntityType> = {
  music: 'track',
  podcast: 'show',
  film: 'movie',
  book: 'album',
};

function detectIntent(t: string): Intent {
  if (/\bpause\b|\bstop\b/.test(t)) return 'pause';
  if (/\bnext\b|\bskip\b/.test(t)) return 'next';
  if (/\bqueue\b/.test(t)) return 'queue';
  if (/\brecommend\b|\bsuggest\b/.test(t)) return 'recommend';
  if (/\bopen\b|\blaunch\b/.test(t)) return 'open';
  return 'play';
}

function detectDomain(t: string): Domain {
  if (/\bpodcast\b/.test(t)) return 'podcast';
  if (/\bmovie\b|\bfilm\b|\bseries\b/.test(t)) return 'film';
  if (/\baudiobook\b|\bbook\b/.test(t)) return 'book';
  return 'music';
}

export function parseIntentDeterministic(transcript: string): LarAction {
  const raw = transcript.trim();
  let t = ` ${raw.toLowerCase()} `;

  const intent = detectIntent(t);
  const domain = detectDomain(t);

  let platform: Platform = 'auto';
  for (const [re, p] of PLATFORM_ALIASES) {
    if (re.test(t)) {
      platform = p;
      t = t.replace(re, ' ');
      break;
    }
  }

  const modifiers: string[] = [];
  for (const m of MODIFIERS) {
    const re = new RegExp(`\\b${m}\\b`);
    if (re.test(t)) {
      modifiers.push(m);
      t = t.replace(re, ' ');
    }
  }

  // strip intent verbs, domain words, then fillers → what's left is the query
  t = t.replace(
    /\b(play|pause|stop|next|skip|queue|open|launch|recommend|suggest|put on|listen to)\b/g,
    ' ',
  );
  t = t.replace(/\b(podcast|movie|film|series|audiobook|book)\b/g, ' ');
  for (const f of FILLERS) t = t.replace(new RegExp(`\\b${f}\\b`, 'g'), ' ');
  let query = t.replace(/\s+/g, ' ').trim();

  const hadEntity = query.length > 0;
  if (!query) query = modifiers.join(' ') || raw;

  const confidence = hadEntity ? 0.75 : modifiers.length ? 0.55 : 0.4;

  return parseLarAction({
    intent,
    domain,
    entity: { type: ENTITY_FOR_DOMAIN[domain], query, id: null },
    platform,
    modifiers,
    targetDevice: null,
    confidence,
  });
}
