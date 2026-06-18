/**
 * Lar design tokens — "Liquid Glass, but ours".
 *
 * The warm amber "hearth" accent IS the brand (the Lar, the household light),
 * deliberately not the cliché cold blue/purple. Fraunces (display) + Manrope
 * (UI). These tokens are the single source for both Tailwind (web) and any
 * canvas/JS rendering, and they descend directly from the Lumina "ember"
 * theme the Control Deck already shipped.
 */

export const color = {
  hearth: '#d98a2b',
  hearthLo: '#f0b357',
  hearthHi: '#f6c878',
  hearthGlow: 'rgba(217,138,43,0.32)',
  teal: '#3aa6a0',
  ink: '#26303c',
  inkSoft: '#5a6573',
  inkFaint: '#8b96a4',
  /** glass surface fills + stroke (light "warm stone" base) */
  glass: 'rgba(255,255,255,0.55)',
  glass2: 'rgba(255,255,255,0.42)',
  stroke: 'rgba(255,255,255,0.65)',
  /** warm ambient mesh stops */
  meshWarm: '#ffd9a8',
  meshViolet: '#c9c1ff',
  meshMint: '#a8ead9',
  meshBlush: '#ffc6c0',
  positive: '#3aa6a0',
  negative: '#d2554d',
} as const;

/**
 * Radius ladder — four named rungs + a pill, matching the runtime CSS
 * (--r-sm/md/lg/xl/pill). `glass` + `card` are kept as back-compat aliases for
 * the Tailwind preset's `rounded-glass` / `rounded-card` utilities.
 */
export const radius = {
  sm: '14px',
  md: '20px',
  lg: '28px',
  xl: '36px',
  pill: '999px',
  glass: '36px',
  card: '28px',
} as const;

/** 8pt spacing scale — mirrors the runtime CSS --s1..--s10. */
export const spacing = {
  s1: '4px',
  s2: '8px',
  s3: '12px',
  s4: '16px',
  s5: '20px',
  s6: '24px',
  s7: '32px',
  s8: '40px',
  s9: '48px',
  s10: '64px',
} as const;

/** Type scale (1.25 modular ratio) — mirrors the runtime CSS --t-* tokens. */
export const typeScale = {
  displayHero: 'clamp(2.6rem, 5.2vw, 3.8rem)',
  display: '46px',
  h1: '34px',
  h2: '27px',
  h3: '21px',
  bodyLg: '17px',
  body: '15px',
  label: '14px',
  caption: '13px',
  eyebrow: '12px',
  micro: '11px',
} as const;

export const font = {
  display: "'Fraunces', ui-serif, Georgia, serif",
  ui: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

export const shadow = {
  glass: '0 18px 50px -20px rgba(40,52,68,.45), 0 6px 18px -10px rgba(40,52,68,.25)',
  hearth: '0 8px 20px -6px rgba(217,138,43,.32)',
} as const;

/** Entrance easing (easeOutQuint) + the snappy press/active curve. */
export const ease = 'cubic-bezier(.22,1,.36,1)';
export const easePress = 'cubic-bezier(.3,.8,.4,1)';

export type Color = keyof typeof color;
