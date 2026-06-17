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
        style={{ width: 'min(420px, 92vw)', display: 'flex', flexDirection: 'column' }}
      >
        <span style={{ display: 'inline-flex', color: 'var(--hearth)', marginBottom: 10 }}>
          <Icon name="mark" size={30} />
        </span>
        <span className="eyebrow">Lar · Sign in</span>
        <h1 className="h1" style={{ fontSize: 30 }}>
          {configured ? 'Welcome back' : 'Sign-in isn’t live yet'}
        </h1>

        {configured ? (
          <>
            <p className="lead">
              Sign in to sync your encrypted space across devices. Lar stays end-to-end encrypted —
              the server only ever holds ciphertext.
            </p>
            <SignInForm />
          </>
        ) : (
          <>
            <p className="lead">
              Lar works fully on this device without an account. Cross-device sync — which is what
              sign-in unlocks — is still being prepared, and stays end-to-end encrypted when it
              arrives.
            </p>
            <div className="btn-row">
              <Link href="/" className="btn ghost">
                <Icon name="home" />
                Back to Lar
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
