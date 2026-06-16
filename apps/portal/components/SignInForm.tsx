'use client';

/**
 * SignInForm — multi-method, passwordless sign-in.
 *
 * Methods:
 *  - OAuth providers (Google now; Apple slots into OAUTH_PROVIDERS once enabled in
 *    Supabase) → signInWithOAuth → the browser bounces to the provider and back to
 *    /auth/confirm with a PKCE ?code.
 *  - Email magic link → signInWithOtp → a one-time link that also lands on /auth/confirm.
 *
 * Lar never handles or stores a password (privacy-first, never-enter-credentials). The
 * browser client is built lazily inside handlers, so this never throws on a draft build.
 */

import { useState } from 'react';
import { Icon } from '@lar/ui';
import { createClient } from '../lib/supabase/client';
import { passkeysSupported, signInWithPasskey } from '../lib/supabase/passkeys';

type Status = 'idle' | 'sending' | 'sent' | 'error';
type OAuthProvider = 'google' | 'apple';

// OAuth buttons, in display order. Add { id: 'apple', label: 'Continue with Apple' }
// here the moment the Apple provider is enabled in Supabase — no other code changes.
const OAUTH_PROVIDERS: ReadonlyArray<{ id: OAuthProvider; label: string }> = [
  { id: 'google', label: 'Continue with Google' },
];

function confirmRedirect(): string | undefined {
  return typeof window !== 'undefined' ? `${window.location.origin}/auth/confirm` : undefined;
}

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function signInWithProvider(provider: OAuthProvider) {
    setStatus('sending');
    setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: confirmRedirect() },
      });
      if (error) {
        setStatus('error');
        setMessage(error.message);
      }
      // On success the browser navigates to the provider — nothing else runs here.
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function onPasskey() {
    setStatus('sending');
    setMessage('');
    try {
      const { error } = await signInWithPasskey();
      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }
      // Session is set client-side; bounce home.
      if (typeof window !== 'undefined') window.location.assign('/');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'No passkey available on this device.');
    }
  }

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;
    setStatus('sending');
    setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: confirmRedirect() },
      });
      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (status === 'sent') {
    return (
      <div className="np" role="status" aria-live="polite">
        <p className="vault-ok">Check your email.</p>
        <p className="lead" style={{ marginBottom: 0 }}>
          We sent a one-time sign-in link to <strong>{email.trim()}</strong>. Open it on this device
          to finish signing in. The link expires shortly and can be used once.
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setStatus('idle');
              setMessage('');
            }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  const busy = status === 'sending';

  return (
    <div className="np">
      {status === 'error' && (
        <p className="err" role="alert">
          {message || 'Could not sign in. Please try again.'}
        </p>
      )}

      {/* OAuth providers + passkey */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OAUTH_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn ghost"
            style={{ width: '100%' }}
            onClick={() => void signInWithProvider(p.id)}
            disabled={busy}
          >
            {p.label}
          </button>
        ))}
        {passkeysSupported() && (
          <button
            type="button"
            className="btn ghost"
            style={{ width: '100%' }}
            onClick={() => void onPasskey()}
            disabled={busy}
          >
            <Icon name="lock" />
            Sign in with a passkey
          </button>
        )}
      </div>

      {/* divider */}
      <div
        aria-hidden
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '18px 0',
          color: 'var(--ink-faint)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span style={{ flex: 1, height: 1, background: 'var(--stroke)' }} />
        or
        <span style={{ flex: 1, height: 1, background: 'var(--stroke)' }} />
      </div>

      {/* Email magic link */}
      <form onSubmit={onSubmitEmail} noValidate>
        <div className="field">
          <label htmlFor="signin-email" className="eyebrow">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
          />
        </div>
        <div className="btn-row" style={{ marginTop: 4 }}>
          <button
            type="submit"
            className="btn primary"
            disabled={busy || email.trim().length === 0}
          >
            <Icon name="lock" />
            {busy ? 'Working…' : 'Email me a sign-in link'}
          </button>
        </div>
      </form>

      <p className="lead" style={{ fontSize: 13.5, marginTop: 18, marginBottom: 0 }}>
        No passwords, ever — sign in with Google or a one-time email link.
      </p>
    </div>
  );
}
