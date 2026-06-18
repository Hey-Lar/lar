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
  /** Gold catch-light — the brightest hearth stop, for CTA fills + lit edges. */
  hearthHi: string;
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
  /** Frostier glass fill for text-heavy / highest surfaces (ask bar, popovers). */
  glassStrong: string;
  /** Content-aware tint (a translucent --body) folded into the fill stack. */
  glassTint: string;
  /** Glass hairline border (the edge that stops a pane reading as a hole). */
  glassStroke: string;
  /** 1px inner-top specular highlight on glass (the lit top-left rim). */
  glassHighlight: string;
  /** Bottom-right counter-light on glass — the faint reflected lower lip. */
  glassRimLo: string;
  /** Soft behind-text scrim to protect glyph contrast on clear panes. */
  glassScrim: string;
  /** Elevation shadow rung 1 (resting tiles). */
  shadow1: string;
  /** Elevation shadow rung 2 (rail, stage chrome, default glass). */
  shadow2: string;
  /** Elevation shadow rung 3 (ask bar, popovers, palette). */
  shadow3: string;
  /** Glass-card stroke. */
  stroke: string;
  /** Glass-card drop shadow (legacy — superseded by the shadow1/2/3 scale). */
  shadow: string;
  /** Ambient mesh: base linear-gradient on the page. */
  meshBase: string;
  /** Ambient mesh radial stops (a/b on `.bg-mesh`, c/d on `.blob` siblings). */
  meshA: string;
  meshB: string;
  meshC: string;
  meshD: string;
  /** Ambient scene silhouette inks (far / near building + mantel rows). */
  silFar: string;
  silNear: string;
  /** Legibility wash painted over the scene + under the glass. */
  sceneScrim: string;
  /**
   * Living-room scene fills (the stylized 3D room behind the glass). Each is a
   * base color the SVG gradients lighten toward the window side + darken away
   * from it. Sunlit + warm on ember/light; cozy + dim on dark.
   *   roomWall     — back-wall panel base
   *   roomWallHi   — wall lit edge (window side / upper)
   *   roomFloor    — wood floor base
   *   roomFloorHi  — floor lit pool near the window
   *   roomFurniture— sofa / table body base
   *   roomFurnitureHi — sofa cushion / lit-side highlight
   *   roomShadow   — soft contact-shadow ink under furniture
   *   roomWindow   — glazing / daylight tint (kept warm via --hearth-glow too)
   */
  roomWall: string;
  roomWallHi: string;
  roomFloor: string;
  roomFloorHi: string;
  roomFurniture: string;
  roomFurnitureHi: string;
  roomShadow: string;
  roomWindow: string;
  /** Rail nav button colors. */
  navIdle: string;
  navActiveBg: string;
};

const sharedAccents = {
  hearth: '#d98a2b',
  hearthLo: '#f0b357',
  hearthHi: '#f6c878',
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
  body: '#f2f5fa',
  // Clear glass: tiles read as see-through panes (room visible through them),
  // not frosted-white cards. Legibility is carried by the cues (stroke +
  // highlight + shadow) and the behind-text --glass-scrim, not the fill alpha.
  // Clear glass: tiles read as see-through panes (room visible through them),
  // not frosted-white cards. A small fill bump (.34→.38) + stronger pane cues
  // (stroke / highlight / shadow) keep transparent tiles reading as distinct
  // glass even over the plain wall, where they were nearly vanishing.
  // Warm-tinted clear glass: the fill picks up the room's warmth (cream, not
  // pure white) so panes read as a single lit material, not white plastic. The
  // specular rim is dropped from a 0.95 white stripe to a 0.66 grazing reflection
  // and paired with a faint bottom-right counter-light (glassRimLo).
  glass: 'rgba(255,248,238,0.30)',
  glass2: 'rgba(255,248,238,0.24)',
  glassStrong: 'rgba(255,252,247,0.52)',
  glassTint: 'rgba(255,248,238,0.10)',
  glassStroke: 'rgba(40,52,68,0.18)',
  glassHighlight: 'rgba(255,255,255,0.66)',
  glassRimLo: 'rgba(40,52,68,0.10)',
  glassScrim: 'rgba(255,252,247,0.66)',
  shadow1: '0 1px 2px rgba(40,52,68,.10), 0 10px 24px -8px rgba(40,52,68,.18)',
  shadow2: '0 1px 3px rgba(40,52,68,.12), 0 14px 36px -8px rgba(40,52,68,.22)',
  shadow3: '0 2px 5px rgba(40,52,68,.14), 0 26px 60px -12px rgba(40,52,68,.26)',
  stroke: 'rgba(255,255,255,0.60)',
  shadow: '0 18px 50px -20px rgba(40,52,68,.45), 0 6px 18px -10px rgba(40,52,68,.25)',
  meshBase: 'linear-gradient(135deg, #f6efe7 0%, #eef0f7 45%, #e9f3ef 100%)',
  meshA: '#ffd9a8',
  meshB: '#c9c1ff',
  meshC: '#a8ead9',
  meshD: '#ffc6c0',
  silFar: 'rgba(40,52,68,.10)',
  silNear: 'rgba(40,52,68,.16)',
  sceneScrim: 'rgba(242,245,250,.24)',
  // Sunlit warm room: clean cream-plaster walls, RICH honey-oak floor, warm
  // ivory sofa. The furniture/floor gap is widened (deeper oak base, brighter
  // sofa highlight) so the sofa/table/lamp clearly stand out as lit 3D objects.
  roomWall: '#e9e0d3',
  roomWallHi: '#f8f2e7',
  roomFloor: '#b9874f',
  roomFloorHi: '#ecca96',
  roomFurniture: '#eadfce',
  roomFurnitureHi: '#fffaf0',
  roomShadow: 'rgba(64,44,24,0.34)',
  roomWindow: '#fff0cf',
  navIdle: '#8b96a4',
  navActiveBg: 'rgba(255,255,255,0.66)',
};

const light: Palette = {
  ...sharedAccents,
  ink: '#26303c',
  inkSoft: '#5a6573',
  inkFaint: '#8b96a4',
  body: '#f7f9fc',
  // Clear glass (cool stone variant) — see ember note above.
  // Clear glass (cool stone variant) — see ember note above. Same small fill
  // bump + stronger pane cues so tiles stay see-through yet read as panes.
  // Cool-neutral stone glass — kept achromatic (no warm tint) but with the same
  // dimmed specular rim (0.70, marginally brighter than ember's cream) and a
  // faint bottom counter-light so panes read as real glass, not frosted plastic.
  glass: 'rgba(255,255,255,0.36)',
  glass2: 'rgba(255,255,255,0.28)',
  glassStrong: 'rgba(255,255,255,0.50)',
  glassTint: 'rgba(255,255,255,0.10)',
  glassStroke: 'rgba(40,52,68,0.17)',
  glassHighlight: 'rgba(255,255,255,0.70)',
  glassRimLo: 'rgba(40,52,68,0.10)',
  glassScrim: 'rgba(255,255,255,0.64)',
  shadow1: '0 1px 2px rgba(40,52,68,.10), 0 10px 24px -8px rgba(40,52,68,.17)',
  shadow2: '0 1px 3px rgba(40,52,68,.11), 0 14px 36px -8px rgba(40,52,68,.21)',
  shadow3: '0 2px 5px rgba(40,52,68,.13), 0 26px 60px -12px rgba(40,52,68,.25)',
  stroke: 'rgba(255,255,255,0.66)',
  shadow: '0 18px 50px -20px rgba(40,52,68,.35), 0 6px 18px -10px rgba(40,52,68,.2)',
  meshBase: 'linear-gradient(135deg, #eef0f7 0%, #f3f0f8 45%, #ecf3f1 100%)',
  meshA: '#c9c1ff',
  meshB: '#a8ead9',
  meshC: '#ffd9a8',
  meshD: '#cfe6ff',
  silFar: 'rgba(40,52,68,.08)',
  silNear: 'rgba(40,52,68,.13)',
  sceneScrim: 'rgba(247,249,252,.26)',
  // Sunlit cool-stone room: clean pale-greige walls, RICHER light-oak floor,
  // off-white sofa. Wider furniture↔floor/wall gap (deeper oak, brighter sofa
  // top) so the furniture reads as solid lit volumes — kept cooler than ember.
  roomWall: '#e6e5e1',
  roomWallHi: '#f6f5f1',
  roomFloor: '#c2a071',
  roomFloorHi: '#efd4ac',
  roomFurniture: '#e8e7e2',
  roomFurnitureHi: '#fefefb',
  roomShadow: 'rgba(48,44,38,0.30)',
  roomWindow: '#fef7e8',
  navIdle: '#8b96a4',
  navActiveBg: 'rgba(255,255,255,0.64)',
};

const dark: Palette = {
  ...sharedAccents,
  ink: '#f0eee8',
  inkSoft: '#a8a8a0',
  inkFaint: '#6e6e66',
  body: '#0e1116',
  // Dark glass was the weakest surface: a 0.06 white fill over #0e1116 made tiles
  // nearly vanish. Lift the fill (warm-neutral, not pure white, so it tints toward
  // the room rather than reading as grey haze), strengthen the stroke + top rim,
  // and add a dark bottom counter-light so panes read as physical glass on the void.
  glass: 'rgba(247,242,235,0.085)',
  glass2: 'rgba(247,242,235,0.06)',
  glassStrong: 'rgba(247,242,235,0.14)',
  glassTint: 'rgba(10,11,15,0.10)',
  glassStroke: 'rgba(255,255,255,0.20)',
  glassHighlight: 'rgba(255,255,255,0.34)',
  glassRimLo: 'rgba(0,0,0,0.30)',
  glassScrim: 'rgba(8,9,13,0.30)',
  shadow1: '0 1px 2px rgba(0,0,0,.24), 0 10px 24px -8px rgba(0,0,0,.44)',
  shadow2: '0 1px 3px rgba(0,0,0,.26), 0 14px 36px -8px rgba(0,0,0,.50)',
  shadow3: '0 2px 5px rgba(0,0,0,.30), 0 26px 60px -12px rgba(0,0,0,.58)',
  stroke: 'rgba(255,255,255,0.12)',
  shadow: '0 24px 60px -22px rgba(0,0,0,0.6), 0 8px 20px -12px rgba(0,0,0,0.5)',
  meshBase: 'linear-gradient(135deg, #0e1116 0%, #131826 45%, #16161c 100%)',
  meshA: '#3a2a14',
  meshB: '#1a2540',
  meshC: '#0f2a26',
  meshD: '#2c1518',
  silFar: 'rgba(255,255,255,.05)',
  silNear: 'rgba(255,255,255,.09)',
  sceneScrim: 'rgba(14,17,22,.34)',
  // Cozy dim room: deep charcoal-warm walls, dark walnut floor, slate sofa lit
  // on its window-facing edge by the warm glazing glow. Furniture is nudged
  // lighter (and its lit edge brighter) and the floor base deeper so the sofa /
  // table / lamp still read as solid volumes against the dim room.
  roomWall: '#1a1d24',
  roomWallHi: '#2c2b2d',
  roomFloor: '#1f1813',
  roomFloorHi: '#4f3724',
  roomFurniture: '#282b33',
  roomFurnitureHi: '#473f37',
  roomShadow: 'rgba(0,0,0,0.50)',
  roomWindow: '#f6dca3',
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
  '--hearth-hi',
  '--hearth-glow',
  '--teal',
  '--pos',
  '--neg',
  '--body',
  '--glass',
  '--glass-2',
  '--glass-strong',
  '--glass-tint',
  '--glass-stroke',
  '--glass-highlight',
  '--glass-rim-lo',
  '--glass-scrim',
  '--shadow-1',
  '--shadow-2',
  '--shadow-3',
  '--stroke',
  '--shadow',
  '--mesh-base',
  '--mesh-a',
  '--mesh-b',
  '--mesh-c',
  '--mesh-d',
  '--sil-far',
  '--sil-near',
  '--scene-scrim',
  '--room-wall',
  '--room-wall-hi',
  '--room-floor',
  '--room-floor-hi',
  '--room-furniture',
  '--room-furniture-hi',
  '--room-shadow',
  '--room-window',
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
      `--hearth-hi: ${p.hearthHi};`,
      `--hearth-glow: ${p.hearthGlow};`,
      `--teal: ${p.teal};`,
      `--pos: ${p.positive};`,
      `--neg: ${p.negative};`,
      `--body: ${p.body};`,
      `--glass: ${p.glass};`,
      `--glass-2: ${p.glass2};`,
      `--glass-strong: ${p.glassStrong};`,
      `--glass-tint: ${p.glassTint};`,
      `--glass-stroke: ${p.glassStroke};`,
      `--glass-highlight: ${p.glassHighlight};`,
      `--glass-rim-lo: ${p.glassRimLo};`,
      `--glass-scrim: ${p.glassScrim};`,
      `--shadow-1: ${p.shadow1};`,
      `--shadow-2: ${p.shadow2};`,
      `--shadow-3: ${p.shadow3};`,
      `--stroke: ${p.stroke};`,
      `--shadow: ${p.shadow};`,
      `--mesh-base: ${p.meshBase};`,
      `--mesh-a: ${p.meshA};`,
      `--mesh-b: ${p.meshB};`,
      `--mesh-c: ${p.meshC};`,
      `--mesh-d: ${p.meshD};`,
      `--sil-far: ${p.silFar};`,
      `--sil-near: ${p.silNear};`,
      `--scene-scrim: ${p.sceneScrim};`,
      `--room-wall: ${p.roomWall};`,
      `--room-wall-hi: ${p.roomWallHi};`,
      `--room-floor: ${p.roomFloor};`,
      `--room-floor-hi: ${p.roomFloorHi};`,
      `--room-furniture: ${p.roomFurniture};`,
      `--room-furniture-hi: ${p.roomFurnitureHi};`,
      `--room-shadow: ${p.roomShadow};`,
      `--room-window: ${p.roomWindow};`,
      `--nav-idle: ${p.navIdle};`,
      `--nav-active-bg: ${p.navActiveBg};`,
    ].join(' ');
    return `[data-theme="${name}"] { ${decls} }`;
  });
  return blocks.join('\n');
}

/** Narrow an unknown value to a valid `ThemeName`, defaulting to DEFAULT_THEME. */
export function coerceTheme(raw: unknown): ThemeName {
  return (THEMES as readonly string[]).includes(raw as string) ? (raw as ThemeName) : DEFAULT_THEME;
}

/** Cycle order used by the toggle: dark → ember → light → dark. */
export function nextTheme(current: ThemeName): ThemeName {
  const i = THEMES.indexOf(current);
  return THEMES[(i + 1) % THEMES.length]!;
}
