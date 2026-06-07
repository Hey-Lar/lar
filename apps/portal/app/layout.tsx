import './globals.css';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  DEFAULT_THEME,
  MOTION_MODES,
  SCENES,
  THEMES,
  THEME_STORAGE_KEY,
  themeCss,
} from '@lar/ui';
import { SceneBackground } from '../components/SceneBackground';

export const metadata = {
  title: 'Lar — the guardian of your home',
  description:
    'A neutral, voice-driven control surface that routes you outward to the best place for each thing. You own the algorithm.',
};

const THEME_CSS = themeCss();

// Pre-hydration boot script (single nonce'd inline script — CSP-safe, no
// external anything): set data-theme / data-scene / data-motion + the scene
// CSS vars on <html> from localStorage BEFORE first paint, so there's no FOUC.
//   - theme  ← `lar-theme`        (allow-listed against THEMES)
//   - scene/motion/intensity/blur ← `lar-appearance` JSON blob (allow-listed)
// Allow-lists are inlined (boot runs before any module loads — can't import).
const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var t=localStorage.getItem(k);var ok=${JSON.stringify(
  THEMES,
)};if(ok.indexOf(t)===-1)t=${JSON.stringify(
  DEFAULT_THEME,
)};d.setAttribute('data-theme',t);}catch(e){d.setAttribute('data-theme',${JSON.stringify(
  DEFAULT_THEME,
)});}try{var ak=${JSON.stringify(APPEARANCE_STORAGE_KEY)};var sceneOk=${JSON.stringify(
  SCENES,
)};var motionOk=${JSON.stringify(MOTION_MODES)};var a=JSON.parse(localStorage.getItem(ak)||'{}');var s=sceneOk.indexOf(a.scene)===-1?${JSON.stringify(
  DEFAULT_APPEARANCE.scene,
)}:a.scene;var m=motionOk.indexOf(a.motion)===-1?${JSON.stringify(
  DEFAULT_APPEARANCE.motion,
)}:a.motion;d.setAttribute('data-scene',s);d.setAttribute('data-motion',m);if(typeof a.sceneIntensity==='number')d.style.setProperty('--scene-intensity',(a.sceneIntensity/100).toString());if(typeof a.glassBlur==='number')d.style.setProperty('--glass-blur',a.glassBlur+'px');}catch(e){d.setAttribute('data-scene',${JSON.stringify(
  DEFAULT_APPEARANCE.scene,
)});d.setAttribute('data-motion',${JSON.stringify(DEFAULT_APPEARANCE.motion)});}})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Per-request nonce from middleware.ts so the CSP can disallow generic
  // 'unsafe-inline' scripts and only accept the boot script + themeCss.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      data-scene={DEFAULT_APPEARANCE.scene}
      data-motion={DEFAULT_APPEARANCE.motion}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <SceneBackground />
        {children}
      </body>
    </html>
  );
}
