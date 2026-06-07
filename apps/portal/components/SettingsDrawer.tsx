'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  MOTION_MODES,
  SCENES,
  THEMES,
  THEME_STORAGE_KEY,
  coerceMotion,
  coerceScene,
  coerceTheme,
  type Appearance,
  type MotionMode,
  type SceneName,
  type ThemeName,
  Icon,
} from '@lar/ui';

/** Glass-blur slider range (px). 20px is the default (elev-2 today). */
const GLASS_MIN = 12;
const GLASS_MAX = 40;

const THEME_LABEL: Record<ThemeName, string> = {
  dark: 'Dark',
  ember: 'Ember',
  light: 'Light',
};

/** A small CSS preview of each theme's surface — page body → glass card. */
const THEME_PREVIEW: Record<ThemeName, string> = {
  dark: 'linear-gradient(135deg, #131826 0%, #16161c 100%)',
  ember: 'linear-gradient(135deg, #f6efe7 0%, #e9f3ef 100%)',
  light: 'linear-gradient(135deg, #eef0f7 0%, #ecf3f1 100%)',
};

const SCENE_LABEL: Record<SceneName, string> = {
  calm: 'Calm',
  hearth: 'Hearth',
  'dawn-skyline': 'Dawn',
  'deep-night': 'Deep night',
  aurora: 'Aurora',
  'warm-mesh': 'Warm mesh',
};

/**
 * Representative gradient thumbnails for the scene picker. True full-fidelity
 * live previews are impractical because the real scene layers are
 * `position: fixed` full-viewport; these inline gradients approximate each
 * scene's dominant colors + signature shape at thumbnail scale (zero extra
 * assets, theme-neutral so they read in all three themes). Each is tuned to be
 * clearly differentiable at a glance: calm = multi-color blobs, hearth = warm
 * glow rising from the bottom-center, dawn = gradient + a dark skyline strip,
 * deep-night = dark field + a cool top glow + tiny stars, aurora = cool
 * teal/indigo ribbons with a warm accent, warm-mesh = a warm multi-color mesh.
 */
const SCENE_THUMB: Record<SceneName, string> = {
  // soft multi-color radial blobs in the corners (the calm mesh)
  calm: 'radial-gradient(circle at 18% 22%, #ffd9a8 0, transparent 46%), radial-gradient(circle at 84% 16%, #c9c1ff 0, transparent 44%), radial-gradient(circle at 64% 86%, #a8ead9 0, transparent 48%), radial-gradient(circle at 8% 90%, #ffc6c0 0, transparent 44%), linear-gradient(135deg, #1a1f2b, #15171d)',
  // dark field with a warm glow rising from the bottom-center (the fireplace)
  hearth:
    'radial-gradient(60% 46% at 50% 112%, rgba(240,179,87,0.95) 0, rgba(217,138,43,0.5) 38%, transparent 74%), linear-gradient(180deg, #161a26 0%, #101319 100%)',
  // dawn vertical gradient + a tiny dark skyline strip pinned to the bottom
  'dawn-skyline':
    'linear-gradient(180deg, #f3b86a 0%, #c98a78 26%, #4a3f63 60%, #1c1b2a 100%), linear-gradient(180deg, transparent 78%, #121119 78%)',
  // very dark with a faint cool top glow + 2–3 tiny star dots
  'deep-night':
    'radial-gradient(1.2px 1.2px at 26% 30%, rgba(220,228,245,0.9) 50%, transparent 51%), radial-gradient(1.2px 1.2px at 70% 22%, rgba(220,228,245,0.85) 50%, transparent 51%), radial-gradient(1px 1px at 50% 42%, rgba(220,228,245,0.75) 50%, transparent 51%), radial-gradient(80% 55% at 50% -16%, #243456 0, transparent 62%), linear-gradient(180deg, #0d1016, #090b0f)',
  // diagonal teal → indigo ribbons with a small warm accent (cool-dominant)
  aurora:
    'linear-gradient(118deg, transparent 10%, rgba(58,166,160,0.85) 40%, transparent 68%), linear-gradient(135deg, transparent 30%, rgba(86,96,210,0.7) 58%, transparent 86%), linear-gradient(72deg, transparent 48%, rgba(240,179,87,0.42) 60%, transparent 74%), linear-gradient(135deg, #0c1014, #111726)',
  // warm multi-color mesh (the legacy scene)
  'warm-mesh':
    'radial-gradient(circle at 22% 20%, #f0b357 0, transparent 50%), radial-gradient(circle at 80% 28%, #d98a2b 0, transparent 48%), radial-gradient(circle at 50% 100%, #8a4a2c 0, transparent 60%), linear-gradient(135deg, #2a1d12, #1a1410)',
};

const MOTION_LABEL: Record<MotionMode, string> = {
  system: 'System',
  on: 'On',
  off: 'Off',
};

const root = () => document.documentElement;

/** Persist the full Appearance blob; mirror `theme` to `lar-theme` for ThemeToggle. */
function persist(next: Appearance) {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(THEME_STORAGE_KEY, next.theme);
  } catch {
    /* private-mode / quota — the live document changes still apply this session */
  }
}

/**
 * Read the live truth from the DOM so the drawer reflects reality even if the
 * stored blob is missing/partial: start from the persisted blob (or defaults)
 * and overlay the actual `data-*` attributes + CSS vars the boot script applied.
 */
function readAppearance(): Appearance {
  const d = root();
  let stored: Partial<Appearance> = {};
  try {
    stored = JSON.parse(
      localStorage.getItem(APPEARANCE_STORAGE_KEY) || '{}',
    ) as Partial<Appearance>;
  } catch {
    stored = {};
  }

  const theme = coerceTheme(d.getAttribute('data-theme') ?? stored.theme);
  const scene = coerceScene(d.getAttribute('data-scene') ?? stored.scene);
  const motion = coerceMotion(d.getAttribute('data-motion') ?? stored.motion);

  const cssIntensity = parseFloat(getComputedStyle(d).getPropertyValue('--scene-intensity'));
  const sceneIntensity = Number.isFinite(cssIntensity)
    ? Math.round(cssIntensity * 100)
    : typeof stored.sceneIntensity === 'number'
      ? stored.sceneIntensity
      : DEFAULT_APPEARANCE.sceneIntensity;

  const cssBlur = parseFloat(getComputedStyle(d).getPropertyValue('--glass-blur'));
  const glassBlur = Number.isFinite(cssBlur)
    ? Math.round(cssBlur)
    : typeof stored.glassBlur === 'number'
      ? stored.glassBlur
      : DEFAULT_APPEARANCE.glassBlur;

  return { theme, scene, sceneIntensity, glassBlur, motion };
}

export interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Appearance settings — a right-side glass drawer wiring the `lar-appearance`
 * model to the live document. Every control applies instantly to
 * `document.documentElement` and persists to localStorage (no Save button);
 * `storage` events keep multiple tabs in sync. The pre-paint boot script in
 * layout.tsx reads the same blob, so a reload restores the look with no FOUC.
 */
export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

  // Sync from the live DOM on mount + whenever the drawer opens (it may have
  // been changed by the ThemeToggle or another tab while closed).
  useEffect(() => {
    if (open) setAppearance(readAppearance());
  }, [open]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== APPEARANCE_STORAGE_KEY && e.key !== THEME_STORAGE_KEY) return;
      const next = readAppearance();
      // Mirror another tab's blob onto this document, then reflect it in the UI.
      root().setAttribute('data-theme', next.theme);
      root().setAttribute('data-scene', next.scene);
      root().setAttribute('data-motion', next.motion);
      root().style.setProperty('--scene-intensity', String(next.sceneIntensity / 100));
      root().style.setProperty('--glass-blur', `${next.glassBlur}px`);
      setAppearance(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const setTheme = (t: ThemeName) => {
    root().setAttribute('data-theme', t);
    update({ theme: t });
  };
  const setScene = (s: SceneName) => {
    root().setAttribute('data-scene', s);
    update({ scene: s });
  };
  const setIntensity = (v: number) => {
    root().style.setProperty('--scene-intensity', String(v / 100));
    update({ sceneIntensity: v });
  };
  const setGlass = (v: number) => {
    root().style.setProperty('--glass-blur', `${v}px`);
    update({ glassBlur: v });
  };
  const setMotion = (m: MotionMode) => {
    root().setAttribute('data-motion', m);
    update({ motion: m });
  };

  return (
    <>
      <div
        className="settings-backdrop"
        data-open={open ? '' : undefined}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className="settings-drawer glass glass--frost"
        data-open={open ? '' : undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Appearance settings"
        aria-hidden={open ? undefined : true}
        inert={open ? undefined : true}
      >
        <header className="sd-head">
          <span className="sd-head-title">
            <Icon name="settings" size={18} />
            Appearance
          </span>
          <button type="button" className="sd-close" onClick={onClose} aria-label="Close settings">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="sd-body">
          {/* Theme */}
          <section className="sd-group" aria-labelledby="sd-theme-l">
            <p className="sd-label" id="sd-theme-l">
              Theme
            </p>
            <div className="sd-swatches" role="group" aria-labelledby="sd-theme-l">
              {THEMES.map((t) => {
                const selected = appearance.theme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`sd-swatch ${selected ? 'is-selected' : ''}`}
                    style={{ background: THEME_PREVIEW[t] }}
                    onClick={() => setTheme(t)}
                    aria-pressed={selected}
                    aria-label={`${THEME_LABEL[t]} theme`}
                    title={THEME_LABEL[t]}
                  >
                    {selected && (
                      <span className="sd-swatch-check" aria-hidden>
                        <Icon name="check" size={16} />
                      </span>
                    )}
                    <span className="sd-swatch-name">{THEME_LABEL[t]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Background scene */}
          <section className="sd-group" aria-labelledby="sd-scene-l">
            <p className="sd-label" id="sd-scene-l">
              Background scene
            </p>
            <div className="sd-scenes" role="group" aria-labelledby="sd-scene-l">
              {SCENES.map((s) => {
                const selected = appearance.scene === s;
                return (
                  <button
                    key={s}
                    type="button"
                    className={`sd-scene ${selected ? 'is-selected' : ''}`}
                    onClick={() => setScene(s)}
                    aria-pressed={selected}
                    aria-label={`${SCENE_LABEL[s]} scene`}
                    title={SCENE_LABEL[s]}
                  >
                    <span className="sd-scene-thumb" style={{ background: SCENE_THUMB[s] }}>
                      {selected && (
                        <span className="sd-scene-check" aria-hidden>
                          <Icon name="check" size={16} />
                        </span>
                      )}
                    </span>
                    <span className="sd-scene-name">{SCENE_LABEL[s]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Scene intensity */}
          <section className="sd-group">
            <label className="sd-label" htmlFor="sd-intensity">
              Scene intensity
              <span className="sd-val">{appearance.sceneIntensity}%</span>
            </label>
            <input
              id="sd-intensity"
              className="sd-range"
              type="range"
              min={0}
              max={100}
              value={appearance.sceneIntensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
            />
          </section>

          {/* Glass blur */}
          <section className="sd-group">
            <label className="sd-label" htmlFor="sd-glass">
              Frost (glass blur)
              <span className="sd-val">{appearance.glassBlur}px</span>
            </label>
            <input
              id="sd-glass"
              className="sd-range"
              type="range"
              min={GLASS_MIN}
              max={GLASS_MAX}
              value={appearance.glassBlur}
              onChange={(e) => setGlass(Number(e.target.value))}
            />
          </section>

          {/* Motion */}
          <section className="sd-group" aria-labelledby="sd-motion-l">
            <p className="sd-label" id="sd-motion-l">
              Motion
            </p>
            <div className="sd-segment" role="group" aria-labelledby="sd-motion-l">
              {MOTION_MODES.map((m) => {
                const selected = appearance.motion === m;
                return (
                  <button
                    key={m}
                    type="button"
                    className={`sd-seg ${selected ? 'is-selected' : ''}`}
                    onClick={() => setMotion(m)}
                    aria-pressed={selected}
                  >
                    {MOTION_LABEL[m]}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
