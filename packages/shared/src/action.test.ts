import { describe, it, expect } from 'vitest';
import { parseLarAction, safeParseLarAction } from './action';

describe('LarAction', () => {
  it('parses a minimal valid action and fills defaults', () => {
    const a = parseLarAction({
      intent: 'play',
      domain: 'music',
      entity: { type: 'track', query: 'Mr. Brightside' },
    });
    expect(a.platform).toBe('auto');
    expect(a.entity.id).toBeNull();
    expect(a.modifiers).toEqual([]);
    expect(a.targetDevice).toBeNull();
    expect(a.confidence).toBe(0);
  });

  it('keeps explicit platform + modifiers', () => {
    const a = parseLarAction({
      intent: 'play',
      domain: 'music',
      entity: { type: 'track', query: 'something calm' },
      platform: 'tidal',
      modifiers: ['calm'],
      confidence: 0.9,
    });
    expect(a.platform).toBe('tidal');
    expect(a.modifiers).toEqual(['calm']);
    expect(a.confidence).toBeCloseTo(0.9);
  });

  it('rejects an empty query', () => {
    expect(
      safeParseLarAction({ intent: 'play', domain: 'music', entity: { type: 'track', query: '' } })
        .success,
    ).toBe(false);
  });

  it('rejects an unknown platform', () => {
    expect(
      safeParseLarAction({
        intent: 'play',
        domain: 'music',
        entity: { type: 'track', query: 'x' },
        platform: 'napster',
      }).success,
    ).toBe(false);
  });

  it('rejects out-of-range confidence', () => {
    expect(
      safeParseLarAction({
        intent: 'play',
        domain: 'music',
        entity: { type: 'track', query: 'x' },
        confidence: 2,
      }).success,
    ).toBe(false);
  });
});
