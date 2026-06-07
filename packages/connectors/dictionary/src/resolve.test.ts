import { describe, it, expect, vi } from 'vitest';
import { parseLarAction } from '@lar/shared';
import { buildWordLinks, resolveWord } from './resolve.js';
import { lookupWord } from './dictionaryapi.js';

function jsonRes(payload: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => payload } as Response;
}

/** Fake fetch routed by URL substring: [matchSubstring, payload, ok?, status?][]. */
function fakeFetch(routes: Array<[string, unknown, boolean?, number?]>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [match, payload, ok = true, status = 200] of routes) {
      if (url.includes(match)) return jsonRes(payload, ok, status);
    }
    throw new Error(`no fake route for ${url}`);
  }) as unknown as typeof fetch;
}

// A realistic dictionaryapi.dev response payload
const dictPayload = [
  {
    word: 'serendipity',
    phonetic: '/ˌsɛɹənˈdɪpɪti/',
    phonetics: [
      {
        text: '/ˌsɛɹənˈdɪpɪti/',
        audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/serendipity-us.mp3',
      },
      { text: '/ˌsɛɹənˈdɪpɪti/', audio: '' },
    ],
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'A combination of events which have come together by chance to make a surprisingly good outcome.',
            example: 'Finding that money was pure serendipity.',
          },
          {
            definition: 'The faculty of finding something good without looking for it.',
            example: 'Serendipity led him to the discovery.',
          },
          { definition: 'Good luck in making unexpected finds.' },
        ],
      },
    ],
    sourceUrls: ['https://en.wiktionary.org/wiki/serendipity'],
  },
];

// A payload with 4 meanings and 4 defs each — to verify capping
const manyMeaningsPayload = [
  {
    word: 'run',
    phonetic: '/rʌn/',
    phonetics: [{ text: '/rʌn/', audio: 'https://example.com/run.mp3' }],
    meanings: [
      {
        partOfSpeech: 'verb',
        definitions: [
          { definition: 'Def 1' },
          { definition: 'Def 2' },
          { definition: 'Def 3' },
          { definition: 'Def 4' },
        ],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          { definition: 'Def 1' },
          { definition: 'Def 2' },
          { definition: 'Def 3' },
          { definition: 'Def 4' },
        ],
      },
      {
        partOfSpeech: 'adjective',
        definitions: [{ definition: 'Def 1' }, { definition: 'Def 2' }],
      },
      {
        partOfSpeech: 'adverb',
        definitions: [{ definition: 'Def 1' }],
      },
    ],
    sourceUrls: ['https://en.wiktionary.org/wiki/run'],
  },
];

const action = parseLarAction({
  intent: 'open',
  domain: 'define',
  entity: { type: 'word', query: 'serendipity' },
});

// ── lookupWord ────────────────────────────────────────────────────────────────

describe('lookupWord', () => {
  it('maps word, phonetic, audioUrl, and senses from the API payload', async () => {
    const fetchImpl = fakeFetch([['dictionaryapi.dev', dictPayload]]);
    const seed = await lookupWord('serendipity', fetchImpl);
    expect(seed.word).toBe('serendipity');
    expect(seed.phonetic).toBe('/ˌsɛɹənˈdɪpɪti/');
    expect(seed.audioUrl).toBe(
      'https://api.dictionaryapi.dev/media/pronunciations/en/serendipity-us.mp3',
    );
    expect(seed.senses).toHaveLength(1);
    expect(seed.senses[0]?.partOfSpeech).toBe('noun');
    expect(seed.senses[0]?.definitions).toHaveLength(3);
    expect(seed.sourceUrls[0]).toBe('https://en.wiktionary.org/wiki/serendipity');
  });

  it('caps at 3 meanings and 3 definitions each', async () => {
    const fetchImpl = fakeFetch([['dictionaryapi.dev', manyMeaningsPayload]]);
    const seed = await lookupWord('run', fetchImpl);
    expect(seed.senses).toHaveLength(3);
    for (const sense of seed.senses) {
      expect(sense.definitions.length).toBeLessThanOrEqual(3);
    }
  });

  it('falls back to first phonetics[].text when top-level phonetic is absent', async () => {
    const noTopPhonetic = [
      {
        word: 'test',
        phonetics: [{ text: '/tɛst/', audio: '' }],
        meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A trial.' }] }],
        sourceUrls: [],
      },
    ];
    const fetchImpl = fakeFetch([['dictionaryapi.dev', noTopPhonetic]]);
    const seed = await lookupWord('test', fetchImpl);
    expect(seed.phonetic).toBe('/tɛst/');
  });

  it('rejects with "No definition found" on HTTP 404', async () => {
    const notFoundPayload = {
      title: 'No Definitions Found',
      message: 'Sorry, no definition found.',
      resolution: '',
    };
    const fetchImpl = fakeFetch([['dictionaryapi.dev', notFoundPayload, false, 404]]);
    await expect(lookupWord('xyzzy', fetchImpl)).rejects.toThrow('No definition found');
  });

  it('audioUrl is undefined when all phonetics have empty audio', async () => {
    const noAudio = [
      {
        word: 'test',
        phonetics: [{ text: '/tɛst/', audio: '' }],
        meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A trial.' }] }],
        sourceUrls: [],
      },
    ];
    const fetchImpl = fakeFetch([['dictionaryapi.dev', noAudio]]);
    const seed = await lookupWord('test', fetchImpl);
    expect(seed.audioUrl).toBeUndefined();
  });
});

// ── buildWordLinks ─────────────────────────────────────────────────────────────

describe('buildWordLinks', () => {
  it('always includes all 3 links', () => {
    const seed = {
      word: 'serendipity',
      senses: [],
      sourceUrls: ['https://en.wiktionary.org/wiki/serendipity'],
    };
    const links = buildWordLinks(seed);
    expect(links['wiktionary']).toBeTruthy();
    expect(links['merriam_webster']).toBeTruthy();
    expect(links['google']).toBeTruthy();
  });

  it('wiktionary uses sourceUrls[0] when present', () => {
    const seed = {
      word: 'serendipity',
      senses: [],
      sourceUrls: ['https://en.wiktionary.org/wiki/serendipity'],
    };
    const links = buildWordLinks(seed);
    expect(links['wiktionary']).toBe('https://en.wiktionary.org/wiki/serendipity');
  });

  it('wiktionary falls back to constructed URL when sourceUrls is empty', () => {
    const seed = { word: 'serendipity', senses: [], sourceUrls: [] };
    const links = buildWordLinks(seed);
    expect(links['wiktionary']).toBe('https://en.wiktionary.org/wiki/serendipity');
  });

  it('URL-encodes special characters in the word', () => {
    const seed = { word: 'café au lait', senses: [], sourceUrls: [] };
    const links = buildWordLinks(seed);
    expect(links['merriam_webster']).toContain(encodeURIComponent('café au lait'));
    expect(links['google']).toContain(encodeURIComponent('café au lait'));
    expect(links['wiktionary']).toContain(encodeURIComponent('café au lait'));
  });
});

// ── resolveWord ───────────────────────────────────────────────────────────────

describe('resolveWord', () => {
  it('resolves word, phonetic, audioUrl, senses, and all 3 links', async () => {
    const fetchImpl = fakeFetch([['dictionaryapi.dev', dictPayload]]);
    const r = await resolveWord(action, fetchImpl);
    expect(r.word).toBe('serendipity');
    expect(r.phonetic).toBe('/ˌsɛɹənˈdɪpɪti/');
    expect(r.audioUrl).toContain('dictionaryapi.dev');
    expect(r.senses.length).toBeGreaterThanOrEqual(1);
    expect(r.links['wiktionary']).toBe('https://en.wiktionary.org/wiki/serendipity');
    expect(r.links['merriam_webster']).toContain('merriam-webster.com');
    expect(r.links['google']).toContain('google.com');
  });

  it('rejects with "No definition found" on 404', async () => {
    const notFoundPayload = { title: 'No Definitions Found' };
    const fetchImpl = fakeFetch([['dictionaryapi.dev', notFoundPayload, false, 404]]);
    await expect(
      resolveWord(
        parseLarAction({
          intent: 'open',
          domain: 'define',
          entity: { type: 'word', query: 'xyzzy' },
        }),
        fetchImpl,
      ),
    ).rejects.toThrow('No definition found');
  });
});

// ── Live smoke test ────────────────────────────────────────────────────────────

it.skipIf(process.env['LAR_LIVE'] !== '1')(
  'live: resolves serendipity (dictionaryapi.dev)',
  async () => {
    const r = await resolveWord(action);
    expect(r.senses.length).toBeGreaterThanOrEqual(1);
    expect(r.links['wiktionary']).toContain('wiktionary');
  },
  20000,
);
