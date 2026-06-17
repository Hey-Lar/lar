import Link from 'next/link';
import { Icon } from '@lar/ui';

export const metadata = { title: 'What leaves your device — Lar' };

/**
 * /privacy — the "what leaves your device" transparency surface. Trust is the product, so
 * this is plain and specific: what NEVER leaves, what Lar's server fetches to resolve a
 * request, and where Lar routes you (you click — Lar sends nothing). Grounded in the actual
 * keyless connector endpoints. Static, public, no account needed.
 */

// Keyless APIs Lar's SERVER fetches from to resolve your request (no account, no key).
const RESOLVERS: ReadonlyArray<{ name: string; use: string; host: string }> = [
  { name: 'Open-Meteo', use: 'Weather + city lookup', host: 'open-meteo.com' },
  { name: 'Nominatim (OpenStreetMap)', use: 'Place search', host: 'nominatim.openstreetmap.org' },
  { name: 'Free Dictionary', use: 'Word definitions', host: 'dictionaryapi.dev' },
  { name: 'MyMemory', use: 'Translations', host: 'mymemory.translated.net' },
  { name: 'Odesli (song.link)', use: 'Cross-platform music links', host: 'song.link' },
  { name: 'Apple iTunes Search', use: 'Music / podcast / book metadata', host: 'itunes.apple.com' },
  { name: 'Open Library', use: 'Book covers + metadata', host: 'openlibrary.org' },
  {
    name: 'FRED · Yahoo Finance',
    use: 'Reference market data (read-only)',
    host: 'stlouisfed.org',
  },
  { name: 'Podcast RSS', use: 'Show feeds', host: 'simplecast.com' },
];

// Places Lar ROUTES you to — you click; Lar sends no data, just opens the link.
const DESTINATIONS: readonly string[] = [
  'Apple Music · Spotify · Tidal · YouTube Music',
  'Apple & Google Podcasts',
  'Apple Books · Google Books · WorldCat libraries',
  'JustWatch · Letterboxd · the streaming services',
  'OpenStreetMap · Apple Maps · Waze',
  'Wikipedia · Wiktionary',
  'Google News · Apple News · Ground News · AP · Reuters · Internet Archive',
];

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main
      className="app"
      style={{ display: 'grid', placeItems: 'start center', minHeight: '100dvh' }}
    >
      <div
        style={{
          width: 'min(680px, 94vw)',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 0 64px',
        }}
      >
        <span className="eyebrow">Lar · Transparency</span>
        <h1 className="h1" style={{ fontSize: 32 }}>
          What leaves your device
        </h1>
        <p className="lead">
          Trust is the product, so here it is plainly — no jargon, no asterisks.
        </p>

        <Section>
          <div className="eyebrow">Never leaves your device</div>
          <p className="lead" style={{ fontSize: 14.5, marginBottom: 0 }}>
            Your memories, notes, and decisions are sealed on this device with AES-256-GCM under a
            key only your passphrase (or recovery phrase) unlocks. The passphrase, the key, and your
            plaintext <strong>never</strong> leave — not to Lar, not to anyone. At rest, storage
            holds ciphertext only. If you turn on sync, the server still only ever sees ciphertext.
          </p>
        </Section>

        <Section>
          <div className="eyebrow">Lar fetches these to answer you (keyless, no account)</div>
          <p className="note" style={{ marginTop: 4, marginBottom: 12 }}>
            When you ask for something, Lar&rsquo;s server looks it up from open, keyless services —
            then hands you links. No API keys, no tracking, no profile.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RESOLVERS.map((r) => (
              <div
                key={r.host}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {r.name} <span className="note">· {r.use}</span>
                </span>
                <span className="note" style={{ whiteSpace: 'nowrap' }}>
                  {r.host}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <div className="eyebrow">Lar routes you here — you click, Lar sends nothing</div>
          <p className="note" style={{ marginTop: 4, marginBottom: 12 }}>
            Lar opens the best destination for each thing. You own the choice; Lar never streams,
            hosts, or middlemans the content.
          </p>
          <ul
            style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {DESTINATIONS.map((d) => (
              <li key={d} className="lead" style={{ fontSize: 14, marginBottom: 0 }}>
                {d}
              </li>
            ))}
          </ul>
        </Section>

        <Section>
          <div className="eyebrow">Bright-lines we cannot cross</div>
          <ul
            style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <li className="lead" style={{ fontSize: 14, marginBottom: 0 }}>
              We never sell, rent, or train on your data — there is no ad business and no data
              business.
            </li>
            <li className="lead" style={{ fontSize: 14, marginBottom: 0 }}>
              Finance is <strong>read-only</strong>: Lar reads, never trades, never moves money.
            </li>
            <li className="lead" style={{ fontSize: 14, marginBottom: 0 }}>
              No audio or video is hosted or streamed by Lar — only links to the official apps.
            </li>
            <li className="lead" style={{ fontSize: 14, marginBottom: 0 }}>
              You can export everything (encrypted backup) and leave at any time.
            </li>
          </ul>
        </Section>

        <div className="btn-row">
          <Link href="/" className="btn ghost">
            <Icon name="home" />
            Back to Lar
          </Link>
        </div>
      </div>
    </main>
  );
}
