/**
 * classifyRoom — the "Hey Lar" navigation brain for INTERNAL Rooms.
 *
 * The media / lookup domains (music, podcasts, books, dictionary, film, places) are
 * resolved server-side by /api/lar into an outward deep link. Everything else — the
 * Rooms that just need to be *opened* (weather, agenda, news, translate, markets,
 * wealth, health, remember, connect, overview) — is matched HERE, so a request like
 * "what's my net worth" opens Wealth instead of being mis-resolved as a song (today
 * the unmatched parser path defaults to a music search).
 *
 * Pure + deterministic: no network, no key, first matching rule wins. The tab keys
 * returned are exactly the Dashboard's TabKeys, so the caller can `onNavigate(tab)`.
 */

export interface RoomRoute {
  /** Dashboard TabKey — pass straight to onNavigate(). */
  tab: string;
  /** Human label for the routing card. */
  label: string;
}

/**
 * Explicit media-launch phrasings ("play …", "listen to …") belong to the media
 * resolver, not here — defer them even if they happen to contain a Room keyword
 * (e.g. a song called "Weather"). Keeps the flagship music path untouched.
 */
const MEDIA_LAUNCH = /\b(play|listen to|put on|queue|stream)\b/;

/**
 * Trigger phrases that belong to the server-resolved lookup domains (places /
 * dictionary / film / media recommendation). Deferred so a Room keyword inside the
 * query can't hijack them — e.g. "directions to Time Out Market" is a PLACE lookup,
 * not the Markets Room.
 */
const DEFER_TO_API =
  /\b(?:directions? to|where is|near me|navigate|on the map|map to|how do i get to|define|definition|meaning of|what does|where (?:can i|to) watch|recommend|suggest)\b/;

/**
 * Ordered rules — first match wins, so more specific / collision-prone rules sit
 * earlier. Each pattern is tuned to avoid stealing genuine media requests.
 */
const ROOM_RULES: ReadonlyArray<{ tab: string; label: string; re: RegExp }> = [
  {
    tab: 'translate',
    label: 'Translate',
    re: /\btranslate\b|\btranslation\b|\bhow do (?:you|i) say\b|\bin (?:french|spanish|german|italian|portuguese|japanese|chinese|mandarin|arabic|dutch|russian|korean|polish)\b|\bsay\b.*\bin\b/,
  },
  {
    tab: 'weather',
    label: 'Weather',
    re: /\bweather\b|\bforecast\b|\btemperature\b|\bhow (?:warm|cold|hot)\b|\brain(?:ing|y)?\b|\bsnow(?:ing|y)?\b|\bsunny\b|\bumbrella\b|\bwindy\b/,
  },
  {
    tab: 'agenda',
    label: 'Agenda',
    re: /\bagenda\b|\bcalendar\b|\bschedule\b|\bmy day\b|\bwhat'?s on (?:today|tomorrow|my)\b|\b(?:next|my) meetings?\b|\bmy events\b|\bappointments?\b/,
  },
  {
    tab: 'news',
    label: 'News',
    re: /\bnews\b|\bheadlines\b|\bwhat'?s happening\b|\bcurrent events\b|\blatest on\b|\bbreaking\b/,
  },
  {
    tab: 'markets',
    label: 'Markets',
    re: /\bmarkets?\b|\bstocks?\b|\bshares?\b|\bportfolio\b|\bholdings\b|\bticker\b|\bnasdaq\b|\bs&p\b|\bdow jones\b|\bindex funds?\b|\betfs?\b/,
  },
  {
    tab: 'wealth',
    label: 'Wealth',
    re: /\bnet worth\b|\bmy (?:money|finances|budget|savings|spending|accounts|wealth)\b|\bhow much (?:money )?(?:do i have|have i)\b|\bfire number\b|\bretirement\b/,
  },
  {
    tab: 'health',
    label: 'Health',
    re: /\bmy health\b|\bsteps\b|\bsleep\b|\bheart rate\b|\bresting heart\b|\blog my (?:run|workout|walk|steps|water)\b|\bfitness\b|\bcalories\b|\bhydration\b/,
  },
  {
    tab: 'remember',
    label: 'Remember',
    re: /\bremember (?:this|that)\b|\bnote to self\b|\bremind me\b|\bsave (?:this|that)\b|\bmy notes\b|\bjot (?:this|that )?down\b|\bmake a note\b/,
  },
  {
    tab: 'connect',
    label: 'Connect',
    re: /\bintegrations?\b|\blink (?:my )?account\b|\bvault\b|\bpair (?:a |my )?device\b|\bconnect (?:my |an? )?account\b/,
  },
  {
    tab: 'home',
    label: 'Overview',
    re: /\boverview\b|\bdashboard\b|\bhome screen\b|\bmy home\b|\bshow me everything\b/,
  },
];

/**
 * Map a transcript to an internal Room, or null when it isn't an internal-navigation
 * request (let /api/lar resolve media / lookups, or fall back to a generic note).
 */
export function classifyRoom(transcript: string): RoomRoute | null {
  const t = ` ${transcript.toLowerCase().trim()} `;
  if (!t.trim()) return null;
  if (MEDIA_LAUNCH.test(t) || DEFER_TO_API.test(t)) return null;
  for (const rule of ROOM_RULES) {
    if (rule.re.test(t)) return { tab: rule.tab, label: rule.label };
  }
  return null;
}
