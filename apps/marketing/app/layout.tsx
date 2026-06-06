import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Lar — the guardian of your home',
  description:
    'A neutral, voice-driven control surface that routes you outward to the best place for each thing — music, podcasts, money, home — so you own the algorithm. Lar never streams, never trades, never locks you in.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="ember">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
