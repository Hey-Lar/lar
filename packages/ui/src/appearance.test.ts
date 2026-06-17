import { describe, expect, it } from 'vitest';
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  MOTION_MODES,
  SCENES,
  coerceMotion,
  coerceScene,
} from './appearance';
import { DEFAULT_THEME } from './themes';

describe('appearance', () => {
  it('lists the seven bundled scenes in picker order (living-room first / default)', () => {
    expect(SCENES).toEqual([
      'living-room',
      'calm',
      'hearth',
      'dawn-skyline',
      'deep-night',
      'aurora',
      'warm-mesh',
    ]);
  });

  it('lists the three motion modes', () => {
    expect(MOTION_MODES).toEqual(['system', 'on', 'off']);
  });

  it('defaults to the default (ember) theme + calm ambient scene under the lar-appearance key', () => {
    expect(APPEARANCE_STORAGE_KEY).toBe('lar-appearance');
    expect(DEFAULT_APPEARANCE.theme).toBe(DEFAULT_THEME);
    expect(DEFAULT_APPEARANCE.scene).toBe('calm');
    expect(DEFAULT_APPEARANCE.sceneIntensity).toBe(60);
    expect(DEFAULT_APPEARANCE.glassBlur).toBe(23);
    expect(DEFAULT_APPEARANCE.motion).toBe('system');
  });

  it('coerceScene accepts every valid scene', () => {
    for (const s of SCENES) expect(coerceScene(s)).toBe(s);
  });

  it('coerceScene falls back to calm for unknown / null / wrong-type inputs', () => {
    expect(coerceScene('nebula')).toBe('calm');
    expect(coerceScene('')).toBe('calm');
    expect(coerceScene(null)).toBe('calm');
    expect(coerceScene(undefined)).toBe('calm');
    expect(coerceScene(7)).toBe('calm');
    expect(coerceScene({})).toBe('calm');
  });

  it('coerceMotion accepts every valid mode', () => {
    for (const m of MOTION_MODES) expect(coerceMotion(m)).toBe(m);
  });

  it('coerceMotion falls back to system for unknown / null / wrong-type inputs', () => {
    expect(coerceMotion('paused')).toBe('system');
    expect(coerceMotion(null)).toBe('system');
    expect(coerceMotion(undefined)).toBe('system');
    expect(coerceMotion(1)).toBe('system');
  });
});
