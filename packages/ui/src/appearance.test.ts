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
  it('lists the six bundled scenes in picker order', () => {
    expect(SCENES).toEqual(['calm', 'hearth', 'dawn-skyline', 'deep-night', 'aurora', 'warm-mesh']);
  });

  it('lists the three motion modes', () => {
    expect(MOTION_MODES).toEqual(['system', 'on', 'off']);
  });

  it('defaults to the default (ember light) theme + hearth scene under the lar-appearance key', () => {
    expect(APPEARANCE_STORAGE_KEY).toBe('lar-appearance');
    expect(DEFAULT_APPEARANCE.theme).toBe(DEFAULT_THEME);
    expect(DEFAULT_APPEARANCE.scene).toBe('hearth');
    expect(DEFAULT_APPEARANCE.sceneIntensity).toBe(60);
    expect(DEFAULT_APPEARANCE.glassBlur).toBe(23);
    expect(DEFAULT_APPEARANCE.motion).toBe('system');
  });

  it('coerceScene accepts every valid scene', () => {
    for (const s of SCENES) expect(coerceScene(s)).toBe(s);
  });

  it('coerceScene falls back to hearth for unknown / null / wrong-type inputs', () => {
    expect(coerceScene('nebula')).toBe('hearth');
    expect(coerceScene('')).toBe('hearth');
    expect(coerceScene(null)).toBe('hearth');
    expect(coerceScene(undefined)).toBe('hearth');
    expect(coerceScene(7)).toBe('hearth');
    expect(coerceScene({})).toBe('hearth');
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
