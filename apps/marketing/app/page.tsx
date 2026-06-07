import { Icon } from '@lar/ui';
import { AvailableOnDemo } from '../components/AvailableOnDemo';
import { Nav } from '../components/Nav';
import { PitchGrid } from '../components/PitchGrid';

export default function HomePage() {
  return (
    <>
      <div className="bg-mesh">
        <div className="blob m1" />
        <div className="blob m2" />
      </div>
      <div className="grain" />

      <div className="shell">
        <Nav />

        {/* HERO */}
        <section className="hero glass">
          <span className="hero-eyebrow">
            <span aria-hidden>
              <Icon name="mark" size={16} />
            </span>{' '}
            The guardian of your home
          </span>
          <h1>
            One <em>warm</em> surface for everything you control.
          </h1>
          <p className="lead">
            Lar is a neutral, voice-driven control surface for your media, money, schedule, and
            home. Type or say what you want — Lar finds it on every platform you use and routes you
            out to play, watch, or open it. You own the algorithm; the platforms don&apos;t.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="http://localhost:4200/">
              See the portal <Icon name="route" size={16} className="chip-arrow" />
            </a>
            <a className="btn ghost" href="https://github.com/amari/lar" rel="noreferrer">
              Read the build
            </a>
          </div>
        </section>

        {/* "Available on" demo */}
        <section className="avail-demo glass">
          <div className="avail-track">
            <div className="avail-cover" aria-hidden>
              <Icon name="music" size={28} />
            </div>
            <div>
              <div className="eyebrow">Try it · keyless demo</div>
              <div className="avail-meta-title">Weightless</div>
              <div className="avail-meta-artist">Marconi Union</div>
            </div>
          </div>
          <AvailableOnDemo />
        </section>

        {/* Anti-lock-in pitch */}
        <section className="pitch">
          <article className="pitch-card glass">
            <span className="eyebrow">Bright-line</span>
            <h3>Lar never streams or trades.</h3>
            <p>
              Music, podcasts, video — Lar resolves your request and opens the official app. Money —
              Lar reads, never writes. No order paths exist anywhere in the code.
            </p>
          </article>
          <article className="pitch-card glass">
            <span className="eyebrow">Your algorithm</span>
            <h3>Cross-platform discovery, your priority order.</h3>
            <p>
              Found on Spotify and Apple Music? Lar honours <em>your</em> ranked list. Explicitly
              said &ldquo;on Tidal&rdquo;? Lar respects that and routes there directly — every time.
            </p>
          </article>
          <article className="pitch-card glass">
            <span className="eyebrow">Your data</span>
            <h3>Client-side crypto. Local-first. No selling, no training.</h3>
            <p>
              Connector keys are encrypted in your browser with AES-256-GCM + PBKDF2-600k —
              ciphertext-only in localStorage, plaintext never leaves the device. Read the source.
            </p>
          </article>
        </section>

        {/* Footer */}
        <footer className="foot glass">
          <div>
            <strong>Lar</strong> · heylar.ai —{' '}
            <span>read-only finance · no advice · no audio hosting</span>
          </div>
          <div>© 2026 · Open source, permissive licenses only</div>
        </footer>
      </div>
    </>
  );
}
