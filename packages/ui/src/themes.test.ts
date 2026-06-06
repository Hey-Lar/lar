import { describe, expect, it } from 'vitest';
import {
  CSS_VARS,
  DEFAULT_THEME,
  THEMES,
  THEME_PALETTES,
  THEME_STORAGE_KEY,
  coerceTheme,
  nextTheme,
  themeCss,
} from './themes';

describe('themes', () => {
  it('exposes three themes in cycle order: dark → ember → light', () => {
    expect(THEMES).toEqual(['dark', 'ember', 'light']);
  });

  it('defaults to ember (the brand-warm Atrium)', () => {
    expect(DEFAULT_THEME).toBe('ember');
    expect(THEME_STORAGE_KEY).toBe('lar-theme');
  });

  it('shares the hearth amber accent across every theme (the brand)', () => {
    for (const name of THEMES) {
      const p = THEME_PALETTES[name];
      expect(p.hearth).toBe('#d98a2b');
      expect(p.hearthLo).toBe('#f0b357');
    }
  });

  it('every theme defines every palette key (no undefined CSS vars)', () => {
    for (const name of THEMES) {
      const p = THEME_PALETTES[name];
      for (const key of Object.keys(THEME_PALETTES.ember) as (keyof typeof p)[]) {
        expect(p[key], `${name}.${String(key)}`).toBeTruthy();
      }
    }
  });

  it('themeCss() emits one [data-theme] block per theme covering every declared CSS var', () => {
    const css = themeCss();
    for (const name of THEMES) expect(css).toContain(`[data-theme="${name}"]`);
    for (const v of CSS_VARS) {
      const occurrences = css.split(`${v}:`).length - 1;
      expect(occurrences, `${v} appears once per theme`).toBe(THEMES.length);
    }
  });

  it('coerceTheme falls back to default for unknown / null / wrong-type inputs', () => {
    expect(coerceTheme('ember')).toBe('ember');
    expect(coerceTheme('dark')).toBe('dark');
    expect(coerceTheme('light')).toBe('light');
    expect(coerceTheme('neon')).toBe(DEFAULT_THEME);
    expect(coerceTheme(null)).toBe(DEFAULT_THEME);
    expect(coerceTheme(undefined)).toBe(DEFAULT_THEME);
    expect(coerceTheme(42)).toBe(DEFAULT_THEME);
  });

  it('nextTheme cycles dark → ember → light → dark', () => {
    expect(nextTheme('dark')).toBe('ember');
    expect(nextTheme('ember')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });

  it('dark theme uses light ink so text stays readable on a near-black body', () => {
    expect(THEME_PALETTES.dark.body).toMatch(/^#0[a-f0-9]{5}$/i);
    expect(THEME_PALETTES.dark.ink.toLowerCase()).not.toBe('#26303c');
  });
});
