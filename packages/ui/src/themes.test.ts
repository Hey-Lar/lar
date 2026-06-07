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

  it('defaults to ember (the warm light "living room" — light-themed by default)', () => {
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

  it('every theme defines the liquid-glass elevation scale (no undefined tokens)', () => {
    for (const name of THEMES) {
      const p = THEME_PALETTES[name];
      for (const key of [
        'glassStrong',
        'glassTint',
        'glassStroke',
        'glassHighlight',
        'glassScrim',
        'shadow1',
        'shadow2',
        'shadow3',
      ] as const) {
        expect(p[key], `${name}.${key}`).toBeTruthy();
      }
    }
  });

  it('glass fills stay clearly see-through: dark very low, ember/light clear (well under 0.55)', () => {
    // dark: white glass sits LOW (0.06) so a near-black body shows through.
    expect(THEME_PALETTES.dark.glass).toBe('rgba(255,255,255,0.06)');
    expect(THEME_PALETTES.dark.glassStrong).toBe('rgba(255,255,255,0.11)');
    // ember + light: clear glass — the room reads THROUGH the tiles. Fill alpha
    // is well below the old frosted-white 0.55; legibility comes from the
    // behind-text scrim + glass cues, not an opaque fill.
    const alpha = (rgba: string) => Number(rgba.match(/[\d.]+(?=\)$)/)![0]);
    for (const name of ['ember', 'light'] as const) {
      const p = THEME_PALETTES[name];
      expect(alpha(p.glass)).toBeLessThan(0.4);
      expect(alpha(p.glassStrong)).toBeLessThan(0.55);
      // …but still a distinct floating pane, not invisible.
      expect(alpha(p.glass)).toBeGreaterThan(0.2);
    }
  });

  it('every theme defines the ambient-scene tokens (silhouettes + scrim)', () => {
    for (const name of THEMES) {
      const p = THEME_PALETTES[name];
      for (const key of ['silFar', 'silNear', 'sceneScrim'] as const) {
        expect(p[key], `${name}.${key}`).toBeTruthy();
      }
    }
  });

  it('themeCss() emits the scene tokens once per theme', () => {
    const css = themeCss();
    for (const v of ['--sil-far', '--sil-near', '--scene-scrim']) {
      const occurrences = css.split(`${v}:`).length - 1;
      expect(occurrences, `${v} appears once per theme`).toBe(THEMES.length);
    }
  });

  it('themeCss() emits the new glass + shadow scale once per theme', () => {
    const css = themeCss();
    for (const v of [
      '--glass-strong',
      '--glass-tint',
      '--glass-stroke',
      '--glass-highlight',
      '--glass-scrim',
      '--shadow-1',
      '--shadow-2',
      '--shadow-3',
    ]) {
      const occurrences = css.split(`${v}:`).length - 1;
      expect(occurrences, `${v} appears once per theme`).toBe(THEMES.length);
    }
  });
});
