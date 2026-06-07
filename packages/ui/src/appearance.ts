/**
 * Lar appearance model — the user-tunable look of the shell (theme + ambient
 * scene + intensity/blur/motion), persisted as one JSON blob under
 * `lar-appearance`. Mirrors `themes.ts`: a thin, dependency-free module so the
 * pre-paint boot script can reference the same allow-lists (inlined — boot runs
 * before any module loads).
 *
 * Privacy: every scene is CSS / inline-SVG (see `SceneBackground` + the
 * `[data-scene]` blocks in globals.css). No `<img>`, no network fetch.
 */
import { DEFAULT_THEME, type ThemeName } from './themes';

/** Bundled ambient scenes, in picker order. */
export const SCENES = [
  'calm',
  'hearth',
  'dawn-skyline',
  'deep-night',
  'aurora',
  'warm-mesh',
] as const;
export type SceneName = (typeof SCENES)[number];

/** Motion gate: follow the OS (`system`), force on, or force off. */
export const MOTION_MODES = ['system', 'on', 'off'] as const;
export type MotionMode = (typeof MOTION_MODES)[number];

export interface Appearance {
  theme: ThemeName;
  scene: SceneName;
  /** 0–100 → drives `--scene-intensity` (a/100): blob opacity + scrim + drift. */
  sceneIntensity: number;
  /** Glass backdrop blur in px → `--glass-blur`. */
  glassBlur: number;
  motion: MotionMode;
  /** Optional `--hearth` accent override; default amber when absent. */
  accent?: string;
}

export const APPEARANCE_STORAGE_KEY = 'lar-appearance';

export const DEFAULT_APPEARANCE: Appearance = {
  theme: DEFAULT_THEME,
  scene: 'hearth',
  sceneIntensity: 60,
  glassBlur: 26,
  motion: 'system',
};

/** Narrow an unknown value to a valid `SceneName`, defaulting to hearth. */
export function coerceScene(v: unknown): SceneName {
  return (SCENES as readonly string[]).includes(v as string) ? (v as SceneName) : 'hearth';
}

/** Narrow an unknown value to a valid `MotionMode`, defaulting to system. */
export function coerceMotion(v: unknown): MotionMode {
  return (MOTION_MODES as readonly string[]).includes(v as string) ? (v as MotionMode) : 'system';
}
