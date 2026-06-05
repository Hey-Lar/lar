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

export const radius = {
  glass: '30px',
  card: '26px',
  pill: '999px',
} as const;

export const font = {
  display: "'Fraunces', ui-serif, Georgia, serif",
  ui: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

export const shadow = {
  glass: '0 18px 50px -20px rgba(40,52,68,.45), 0 6px 18px -10px rgba(40,52,68,.25)',
  hearth: '0 8px 20px -6px rgba(217,138,43,.32)',
} as const;

export const ease = 'cubic-bezier(.22,1,.36,1)';

export type Color = keyof typeof color;
