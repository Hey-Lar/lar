'use client';

/**
 * SignInForm — passwordless, email magic-link sign-in.
 *
 * Why passwordless: Lar never handles or stores a password (aligns with the
 * privacy-first, never-enter-credentials line). The user gets a one-time link by
 * email; clicking it lands on /auth/confirm, which verifies the token server-side
 * and sets the session cookie. No password ever exists to leak.
 *
 * This component only renders when Supabase is configured (the /login page gates
 * on isSupabaseConfigured), and it constructs the browser client lazily inside the
 * submit handler — so it can never throw on an unconfigured (draft) build.
 */

import { useState } from 'react';
import { Icon } from '@lar/ui';
import { createClient } from '../lib/supabase/client';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;
    setStatus('sending');
    setMessage('');
    try {
      const supabase = createClient();
      const emailRedirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/confirm` : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo },
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

  return (
    <form className="np" onSubmit={onSubmit} noValidate>
      {status === 'error' && (
        <p className="err" role="alert">
          {message || 'Could not send the link. Please try again.'}
        </p>
      )}
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
          disabled={status === 'sending'}
        />
      </div>
      <div className="btn-row" style={{ marginTop: 4 }}>
        <button
          type="submit"
          className="btn primary"
          disabled={status === 'sending' || email.trim().length === 0}
        >
          <Icon name="lock" />
          {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </div>
      <p className="lead" style={{ fontSize: 13.5, marginTop: 18, marginBottom: 0 }}>
        No password. Lar emails you a one-time link — nothing to remember, nothing to leak.
      </p>
    </form>
  );
}
