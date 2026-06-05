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
