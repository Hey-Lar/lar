import { describe, it, expect } from 'vitest';
import { parseIntentDeterministic } from './intent';

describe('parseIntentDeterministic', () => {
  it('parses "play X on Spotify"', () => {
    const a = parseIntentDeterministic('play Mr Brightside on Spotify');
    expect(a.intent).toBe('play');
    expect(a.platform).toBe('spotify');
    expect(a.domain).toBe('music');
    expect(a.entity.query).toBe('mr brightside');
    expect(a.confidence).toBeGreaterThan(0.7);
  });

  it('captures a mood modifier and routes platform ("something calm on Tidal")', () => {
    const a = parseIntentDeterministic('play something calm on Tidal');
    expect(a.platform).toBe('tidal');
    expect(a.modifiers).toContain('calm');
    expect(a.entity.query.length).toBeGreaterThan(0);
  });

  it('detects pause', () => {
    expect(parseIntentDeterministic('pause').intent).toBe('pause');
  });

  it('detects a recommend + podcast domain', () => {
    const a = parseIntentDeterministic('recommend a chill podcast');
    expect(a.intent).toBe('recommend');
    expect(a.domain).toBe('podcast');
    expect(a.entity.type).toBe('show');
    expect(a.modifiers).toContain('chill');
  });

  it('defaults platform to auto when unspecified', () => {
    const a = parseIntentDeterministic('play despacito');
    expect(a.platform).toBe('auto');
    expect(a.entity.query).toBe('despacito');
  });

  it('strips "find" and domain word from "find the Lex Fridman podcast"', () => {
    const a = parseIntentDeterministic('find the Lex Fridman podcast');
    expect(a.domain).toBe('podcast');
    expect(a.entity.type).toBe('show');
    expect(a.entity.query).toBe('lex fridman');
  });

  it('strips "search for" from "search for despacito"', () => {
    const a = parseIntentDeterministic('search for despacito');
    expect(a.entity.query).toBe('despacito');
  });

  it('strips "show me" and routes platform from "show me something calm on Spotify"', () => {
    const a = parseIntentDeterministic('show me something calm on Spotify');
    expect(a.platform).toBe('spotify');
    expect(a.modifiers).toContain('calm');
    expect(a.entity.query).not.toMatch(/\bshow\b/);
    expect(a.entity.query).not.toMatch(/\bme\b/);
  });

  it('does not over-strip "get" from "play Get Lucky on Spotify"', () => {
    const a = parseIntentDeterministic('play Get Lucky on Spotify');
    expect(a.platform).toBe('spotify');
    expect(a.entity.query).toBe('get lucky');
  });

  it('does not over-strip "search" from "find the Search Engine podcast"', () => {
    const a = parseIntentDeterministic('find the Search Engine podcast');
    expect(a.domain).toBe('podcast');
    expect(a.entity.query).toBe('search engine');
  });
});

describe('domain detection', () => {
  it('"find the Lex Fridman podcast" → domain=podcast, query=lex fridman', () => {
    const a = parseIntentDeterministic('find the Lex Fridman podcast');
    expect(a.domain).toBe('podcast');
    expect(a.entity.query).toBe('lex fridman');
  });

  it('"define serendipity" → domain=define, query=serendipity', () => {
    const a = parseIntentDeterministic('define serendipity');
    expect(a.domain).toBe('define');
    expect(a.entity.type).toBe('word');
    expect(a.entity.query).toBe('serendipity');
  });

  it('"what does serendipity mean" → domain=define, query=serendipity', () => {
    const a = parseIntentDeterministic('what does serendipity mean');
    expect(a.domain).toBe('define');
    expect(a.entity.query).toBe('serendipity');
  });

  it('"directions to Time Out Market Lisbon" → domain=place, query contains venue name', () => {
    const a = parseIntentDeterministic('directions to Time Out Market Lisbon');
    expect(a.domain).toBe('place');
    expect(a.entity.type).toBe('location');
    expect(a.entity.query).toBe('time out market lisbon');
  });

  it('"where can I watch Dune" → domain=film, query=dune', () => {
    const a = parseIntentDeterministic('where can I watch Dune');
    expect(a.domain).toBe('film');
    expect(a.entity.type).toBe('movie');
    expect(a.entity.query).toBe('dune');
  });

  it('"find the book Dune" → domain=book, query=dune', () => {
    const a = parseIntentDeterministic('find the book Dune');
    expect(a.domain).toBe('book');
    expect(a.entity.query).toBe('dune');
  });

  it('"play Mr Brightside on Tidal" → domain=music, query=mr brightside, platform=tidal (REGRESSION GUARD)', () => {
    const a = parseIntentDeterministic('play Mr Brightside on Tidal');
    expect(a.domain).toBe('music');
    expect(a.entity.query).toBe('mr brightside');
    expect(a.platform).toBe('tidal');
  });

  it('"the daily" (bare, no keyword) → domain=music (default); query=daily', () => {
    // "the" is a FILLER and is stripped; "daily" is the leftover query.
    // This confirms non-keyword phrases still fall through to the music default.
    const a = parseIntentDeterministic('the daily');
    expect(a.domain).toBe('music');
    expect(a.entity.query).toBe('daily');
  });
});
