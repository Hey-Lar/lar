'use client';

/**
 * StepUpChallenge — the 6-digit prompt that raises an aal1 session to aal2 when the user
 * has a verified TOTP factor. Shown by /account when getAuthenticatorAssuranceLevel()
 * reports a pending step-up; on success we router.refresh() so the page re-renders at aal2
 * (unlocking the security controls). Without this, an enrolled user could never step up.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@lar/ui';
import { listFactors, verifyTotp } from '../../lib/supabase/mfa';

export function StepUpChallenge() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await listFactors();
      const factor = data?.totp?.[0];
      if (!factor) {
        setError('No authenticator found on this account.');
        return;
      }
      const { error: err } = await verifyTotp(factor.id, code.trim());
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh(); // re-render at aal2 → security controls unlock
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="eyebrow">Two-factor required</div>
      <p className="lead" style={{ fontSize: 14.5, marginBottom: 14 }}>
        Enter the 6-digit code from your authenticator app to manage your security settings.
      </p>
      <form className="np" onSubmit={submit} noValidate>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <div className="field">
          <label htmlFor="stepup-code" className="eyebrow">
            6-digit code
          </label>
          <input
            id="stepup-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            disabled={busy}
          />
        </div>
        <div className="btn-row" style={{ marginTop: 4 }}>
          <button type="submit" className="btn primary" disabled={busy || code.trim().length < 6}>
            <Icon name="lock" />
            {busy ? 'Verifying…' : 'Verify'}
          </button>
        </div>
      </form>
    </div>
  );
}
