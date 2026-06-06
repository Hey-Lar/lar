import './globals.css';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY, themeCss } from '@lar/ui';

export const metadata = {
  title: 'Lar — the guardian of your home',
  description:
    'A neutral, voice-driven control surface that routes you outward to the best place for each thing. You own the algorithm.',
};

const THEME_CSS = themeCss();

// Pre-hydration script: read the saved theme from localStorage and set
// data-theme on <html> before first paint. Inlined to avoid FOUC.
const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var ok=${JSON.stringify(
  THEMES,
)};if(ok.indexOf(t)===-1)t=${JSON.stringify(DEFAULT_THEME)};document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme',${JSON.stringify(
  DEFAULT_THEME,
)});}})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Per-request nonce from middleware.ts so the CSP can disallow generic
  // 'unsafe-inline' scripts and only accept the boot script + themeCss.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" data-theme={DEFAULT_THEME}>
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
      <body>{children}</body>
    </html>
  );
}
