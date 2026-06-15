import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://heylar.ai';
const DESCRIPTION =
  'A neutral, voice-driven control surface that routes you outward to the best place for each thing — music, podcasts, money, home — so you own the algorithm. Lar never streams, never trades, never locks you in. Local-first, end-to-end encrypted, never sold.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Lar — the guardian of your home',
    template: '%s — Lar',
  },
  description: DESCRIPTION,
  applicationName: 'Lar',
  keywords: [
    'Lar',
    'HeyLar',
    'voice assistant',
    'privacy-first',
    'local-first',
    'end-to-end encryption',
    'control surface',
    'neutral assistant',
    'read-only finance',
  ],
  category: 'technology',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Lar',
    title: 'Lar — the guardian of your home',
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lar — the guardian of your home',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  themeColor: '#f3ece3',
  colorScheme: 'light',
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
