/**
 * dictionaryapi.dev (Wiktionary data) client — keyless, read-only, open data.
 *
 * Bright-line: definition data only. Lar uses this to show word senses and
 * build outward links. It never stores query history and no API key is required.
 *
 * See https://dictionaryapi.dev/
 */

const DICT_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export interface WordSense {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
}

export interface WordSeed {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  senses: WordSense[];
  sourceUrls: string[];
}

interface DictApiDefinition {
  definition: string;
  example?: string;
}

interface DictApiMeaning {
  partOfSpeech: string;
  definitions: DictApiDefinition[];
}

interface DictApiPhonetic {
  text?: string;
  audio?: string;
}

interface DictApiEntry {
  word: string;
  phonetic?: string;
  phonetics: DictApiPhonetic[];
  meanings: DictApiMeaning[];
  sourceUrls: string[];
}

export async function lookupWord(word: string, fetchImpl: typeof fetch = fetch): Promise<WordSeed> {
  const url = `${DICT_API_BASE}/${encodeURIComponent(word)}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`No definition found for "${word}"`);

  const data = (await res.json()) as DictApiEntry[];
  const entry = data[0];
  if (!entry) throw new Error(`No definition found for "${word}"`);

  // Phonetic text: prefer the top-level `phonetic`, then first phonetics[].text
  const phonetic =
    entry.phonetic?.trim() ||
    entry.phonetics.find((p) => p.text && p.text.trim())?.text?.trim() ||
    undefined;

  // Audio URL: first phonetics[].audio that is non-empty
  const audioUrl =
    entry.phonetics.find((p) => p.audio && p.audio.trim() !== '')?.audio ?? undefined;

  // Senses: map meanings → WordSense, cap to first 3 meanings, 3 defs each
  const senses: WordSense[] = entry.meanings.slice(0, 3).map((m) => ({
    partOfSpeech: m.partOfSpeech,
    definitions: m.definitions.slice(0, 3).map((d) => ({
      definition: d.definition,
      ...(d.example ? { example: d.example } : {}),
    })),
  }));

  return {
    word: entry.word,
    ...(phonetic ? { phonetic } : {}),
    ...(audioUrl ? { audioUrl } : {}),
    senses,
    sourceUrls: entry.sourceUrls,
  };
}
