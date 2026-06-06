/**
 * Lar tri-theme system (dark "Synex" · ember "Atrium" · light "Stone").
 *
 * The amber **hearth** accent is the brand — it is identical across all three
 * themes. Themes vary the page surface, glass fills, ink contrast, and the
 * ambient mesh stops. A theme is selected by setting `data-theme="<name>"` on
 * the `<html>` element; CSS variables flip; nothing rebuilds.
 *
 * Source-of-truth for both the runtime CSS (injected via `themeCss()` in the
 * portal's `<head>`) and design docs / canvas. Tailwind tokens (see
 * `tailwind-preset.ts`) continue to mirror the ember palette as build-time
 * defaults; everything that needs to vary at runtime reads CSS vars.
 */

export const THEMES = ['dark', 'ember', 'light'] as const;
export type ThemeName = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeName = 'ember';
export const THEME_STORAGE_KEY = 'lar-theme';

export type Palette = {
  /** Primary text color. Light on dark, dark on ember/light. */
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** Brand accent — amber hearth, shared across themes. */
  hearth: string;
  hearthLo: string;
  hearthGlow: string;
  teal: string;
  positive: string;
  negative: string;
  /** Page base background sitting under the mesh. */
  body: string;
  /** Primary glass-card fill. */
  glass: string;
  /** Secondary glass-card fill (inner cards). */
  glass2: string;
  /** Glass-card stroke. */
  stroke: string;
  /** Glass-card drop shadow. */
  shadow: string;
  /** Ambient mesh: base linear-gradient on the page. */
  meshBase: string;
  /** Ambient mesh radial stops (a/b on `.bg-mesh`, c/d on `.blob` siblings). */
  meshA: string;
  meshB: string;
  meshC: string;
  meshD: string;
  /** Rail nav button colors. */
  navIdle: string;
  navActiveBg: string;
};

const sharedAccents = {
  hearth: '#d98a2b',
  hearthLo: '#f0b357',
  hearthGlow: 'rgba(217,138,43,0.32)',
  teal: '#3aa6a0',
  positive: '#3aa6a0',
  negative: '#d2554d',
} as const;

const ember: Palette = {
  ...sharedAccents,
  ink: '#26303c',
  inkSoft: '#5a6573',
  inkFaint: '#8b96a4',
  body: '#eef1f6',
  glass: 'rgba(255,255,255,0.55)',
  glass2: 'rgba(255,255,255,0.42)',
  stroke: 'rgba(255,255,255,0.65)',
  shadow: '0 18px 50px -20px rgba(40,52,68,.45), 0 6px 18px -10px rgba(40,52,68,.25)',
  meshBase: 'linear-gradient(135deg, #f6efe7 0%, #eef0f7 45%, #e9f3ef 100%)',
  meshA: '#ffd9a8',
  meshB: '#c9c1ff',
  meshC: '#a8ead9',
  meshD: '#ffc6c0',
  navIdle: '#8b96a4',
  navActiveBg: 'rgba(255,255,255,0.62)',
};

const light: Palette = {
  ...sharedAccents,
  ink: '#26303c',
  inkSoft: '#5a6573',
  inkFaint: '#8b96a4',
  body: '#f4f6fa',
  glass: 'rgba(255,255,255,0.62)',
  glass2: 'rgba(255,255,255,0.5)',
  stroke: 'rgba(255,255,255,0.72)',
  shadow: '0 18px 50px -20px rgba(40,52,68,.35), 0 6px 18px -10px rgba(40,52,68,.2)',
  meshBase: 'linear-gradient(135deg, #eef0f7 0%, #f3f0f8 45%, #ecf3f1 100%)',
  meshA: '#c9c1ff',
  meshB: '#a8ead9',
  meshC: '#ffd9a8',
  meshD: '#cfe6ff',
  navIdle: '#8b96a4',
  navActiveBg: 'rgba(255,255,255,0.7)',
};

const dark: Palette = {
  ...sharedAccents,
  ink: '#f0eee8',
  inkSoft: '#a8a8a0',
  inkFaint: '#6e6e66',
  body: '#0e1116',
  glass: 'rgba(255,255,255,0.06)',
  glass2: 'rgba(255,255,255,0.04)',
  stroke: 'rgba(255,255,255,0.12)',
  shadow: '0 24px 60px -22px rgba(0,0,0,0.6), 0 8px 20px -12px rgba(0,0,0,0.5)',
  meshBase: 'linear-gradient(135deg, #0e1116 0%, #131826 45%, #16161c 100%)',
  meshA: '#3a2a14',
  meshB: '#1a2540',
  meshC: '#0f2a26',
  meshD: '#2c1518',
  navIdle: '#6e6e66',
  navActiveBg: 'rgba(255,255,255,0.10)',
};

export const THEME_PALETTES: Record<ThemeName, Palette> = { dark, ember, light };

/** CSS variable names the runtime expects on `[data-theme="<name>"]`. */
export const CSS_VARS = [
  '--ink',
  '--ink-soft',
  '--ink-faint',
  '--hearth',
  '--hearth-lo',
  '--hearth-glow',
  '--teal',
  '--pos',
  '--neg',
  '--body',
  '--glass',
  '--glass-2',
  '--stroke',
  '--shadow',
  '--mesh-base',
  '--mesh-a',
  '--mesh-b',
  '--mesh-c',
  '--mesh-d',
  '--nav-idle',
  '--nav-active-bg',
] as const;

/**
 * Render the three `[data-theme]` blocks as one CSS string. Inject into a
 * `<style>` tag in `<head>` so the variables are present before first paint.
 */
export function themeCss(): string {
  const blocks = THEMES.map((name) => {
    const p = THEME_PALETTES[name];
    const decls = [
      `--ink: ${p.ink};`,
      `--ink-soft: ${p.inkSoft};`,
      `--ink-faint: ${p.inkFaint};`,
      `--hearth: ${p.hearth};`,
      `--hearth-lo: ${p.hearthLo};`,
      `--hearth-glow: ${p.hearthGlow};`,
      `--teal: ${p.teal};`,
      `--pos: ${p.positive};`,
      `--neg: ${p.negative};`,
      `--body: ${p.body};`,
      `--glass: ${p.glass};`,
      `--glass-2: ${p.glass2};`,
      `--stroke: ${p.stroke};`,
      `--shadow: ${p.shadow};`,
      `--mesh-base: ${p.meshBase};`,
      `--mesh-a: ${p.meshA};`,
      `--mesh-b: ${p.meshB};`,
      `--mesh-c: ${p.meshC};`,
      `--mesh-d: ${p.meshD};`,
      `--nav-idle: ${p.navIdle};`,
      `--nav-active-bg: ${p.navActiveBg};`,
    ].join(' ');
    return `[data-theme="${name}"] { ${decls} }`;
  });
  return blocks.join('\n');
}

/** Narrow an unknown value to a valid `ThemeName`, defaulting to ember. */
export function coerceTheme(raw: unknown): ThemeName {
  return (THEMES as readonly string[]).includes(raw as string) ? (raw as ThemeName) : DEFAULT_THEME;
}

/** Cycle order used by the toggle: dark → ember → light → dark. */
export function nextTheme(current: ThemeName): ThemeName {
  const i = THEMES.indexOf(current);
  return THEMES[(i + 1) % THEMES.length]!;
}
