/**
 * @lar/connector-translate — keyless translation + route-outward.
 *
 * BRIGHT-LINE: read-only, keyless, route-outward. We fetch a quick translation
 * from MyMemory (no key, no token — Wiktionary-style open data) AND hand the user
 * outward links to the best dedicated translators (DeepL, Google, WordReference) so
 * they own the deeper work. Lar stores nothing — no text, no history.
 *
 * The MyMemory fetch is done server-side (from /api/translate) so the browser only
 * calls same-origin and the CSP connect-src list stays unchanged.
 */

export type LangCode = string;

export type TranslateLink = 'deepl' | 'google' | 'wordreference';

export interface TranslateResult {
  source: string;
  translated: string;
  from: LangCode;
  to: LangCode;
  /** "match" confidence 0..1 from MyMemory, when present. */
  match?: number;
  links: Record<TranslateLink, string>;
}

/** A small, sane allow-list of language codes the UI offers. */
export const LANGS: ReadonlyArray<{ code: LangCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
] as const;

const LANG_CODES = new Set(LANGS.map((l) => l.code));

function assertLang(label: string, code: string): void {
  if (!LANG_CODES.has(code)) throw new Error(`${label} language "${code}" is not supported`);
}

/**
 * Pure, total outward-link builder. Encodes the text for each target translator.
 * Never throws on content (only on unknown lang codes, validated by the caller).
 */
export function buildTranslateLinks(
  text: string,
  from: LangCode,
  to: LangCode,
): Record<TranslateLink, string> {
  const q = encodeURIComponent(text);
  return {
    deepl: `https://www.deepl.com/translator#${from}/${to}/${q}`,
    google: `https://translate.google.com/?sl=${from}&tl=${to}&text=${q}&op=translate`,
    wordreference: `https://www.wordreference.com/${from}${to}/${q}`,
  };
}

interface MyMemoryResponse {
  responseData?: { translatedText?: unknown; match?: unknown };
  responseStatus?: number;
}

/**
 * Translate `text` from → to. Fetches MyMemory (keyless) and attaches outward links.
 *
 * Throws:
 *   - 'nothing to translate'                 — empty text
 *   - 'from/to language "X" is not supported' — bad lang code
 *   - 'translation unavailable'              — upstream returned no usable text
 */
export async function resolveTranslate(
  text: string,
  from: LangCode,
  to: LangCode,
  fetchImpl: typeof fetch = fetch,
): Promise<TranslateResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('nothing to translate');
  assertLang('from', from);
  assertLang('to', to);

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    trimmed,
  )}&langpair=${from}|${to}`;
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': 'HeyLar/0.1 (+https://heylar.ai) keyless-translate' },
  });
  if (!res.ok) throw new Error(`translation service ${res.status}`);

  const data = (await res.json()) as MyMemoryResponse;
  const translated = data?.responseData?.translatedText;
  if (typeof translated !== 'string' || translated.length === 0)
    throw new Error('translation unavailable');

  const matchRaw = data.responseData?.match;
  const match = typeof matchRaw === 'number' ? matchRaw : undefined;

  return {
    source: trimmed,
    translated,
    from,
    to,
    match,
    links: buildTranslateLinks(trimmed, from, to),
  };
}
