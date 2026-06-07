'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type ThemeName,
  Icon,
  type IconName,
  coerceTheme,
  nextTheme,
} from '@lar/ui';

const THEME_LABEL: Record<ThemeName, string> = {
  dark: 'Dark — Synex',
  ember: 'Ember — Atrium',
  light: 'Light — Stone',
};

const THEME_GLYPH: Record<ThemeName, IconName> = {
  dark: 'moon',
  ember: 'mark',
  light: 'wx-clear',
};

/**
 * Cycles dark -> ember -> light. The pre-hydration script in layout.tsx already
 * set `data-theme` on <html> from localStorage before paint, so we read it
 * back on mount instead of rendering a default that would flash.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    const current = coerceTheme(document.documentElement.getAttribute('data-theme'));
    setTheme(current);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY || !e.newValue) return;
      const t = coerceTheme(e.newValue);
      document.documentElement.setAttribute('data-theme', t);
      setTheme(t);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const cycle = () => {
    const next = nextTheme(theme);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private-mode / quota — theme still applies for the session */
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="theme-btn"
      onClick={cycle}
      title={`Theme: ${THEME_LABEL[theme]} (click to cycle)`}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Click to cycle to the next theme.`}
    >
      <span aria-hidden>
        <Icon name={THEME_GLYPH[theme]} size={22} />
      </span>
    </button>
  );
}
