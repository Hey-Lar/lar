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
});
