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
  place: 'location',
  define: 'word',
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
  if (/\bpodcasts?\b/.test(t)) return 'podcast';
  if (/\bdefine\b|\bdefinition\b|\bwhat does\b|\bmeaning of\b|\bspell\b/.test(t)) return 'define';
  if (
    /\bdirections?\b|\bnear me\b|\bnavigate\b|\bwhere is\b|\bhow do i get to\b|\bon the map\b|\bmap to\b/.test(
      t,
    )
  )
    return 'place';
  if (/\bmovies?\b|\bfilms?\b|\bseries\b|\btv show\b|\bwhere to watch\b|\bwatch\b/.test(t))
    return 'film';
  if (/\baudiobooks?\b|\bbooks?\b|\bnovels?\b/.test(t)) return 'book';
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

  // strip intent verbs + lookup verbs, domain words, then fillers → what's left is the query
  t = t.replace(
    /\b(play|pause|stop|next|skip|queue|open|launch|recommend|suggest|put on|listen to|search for|look up|show me|get me|find|lookup)\b/g,
    ' ',
  );
  // Multi-word domain phrases first (so partials don't linger).
  t = t.replace(
    /\b(where can i watch|where to watch|how do i get to|directions to|near me|where is|meaning of|definition of|what does|on the map|map to)\b/g,
    ' ',
  );
  // Single domain trigger words.
  t = t.replace(
    /\b(podcasts?|movies?|films?|series|tv show|audiobooks?|books?|novels?|directions?|navigate|define|definition|spell|meaning|mean|watch)\b/g,
    ' ',
  );
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
