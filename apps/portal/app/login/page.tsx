import Link from 'next/link';
import { Icon } from '@lar/ui';
import { isSupabaseConfigured } from '../../lib/supabase/config';
import { SignInForm } from '../../components/SignInForm';

export const metadata = {
  title: 'Sign in — Lar',
};

/**
 * /login — a standalone route (NOT a dashboard rail tab). The keyless app keeps
 * working without ever visiting here; this exists for when sync/identity is armed.
 *
 * While Supabase is unconfigured (the draft state), it renders an inert "not live
 * yet" card — no form, no client, nothing to break — so the build stays clean and
 * a reviewer can see exactly what's coming.
 */
export default function LoginPage() {
  const configured = isSupabaseConfigured();
  return (
    <main
      style={{
        position: 'relative',
        zIndex: 2,
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <section
        className="card"
        style={{
          width: 'min(424px, 92vw)',
          display: 'flex',
          flexDirection: 'column',
          padding: '34px 32px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', color: 'var(--hearth)', marginBottom: 14 }}>
            <Icon name="mark" size={34} />
          </span>
          <div className="eyebrow">Lar · Sign in</div>
          <h1 className="h1" style={{ fontSize: 30, margin: '4px 0 0' }}>
            {configured ? 'Welcome back' : 'Sign-in isn’t live yet'}
          </h1>
          <p className="lead" style={{ marginTop: 10, marginBottom: 24 }}>
            {configured
              ? 'Sign in to sync your encrypted space across devices — end-to-end encrypted, so the server only ever holds ciphertext.'
              : 'Lar works fully on this device without an account. Sign-in unlocks encrypted cross-device sync — still being prepared.'}
          </p>
        </div>

        {configured ? (
          <SignInForm />
        ) : (
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <Link href="/" className="btn ghost">
              <Icon name="home" />
              Back to Lar
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
