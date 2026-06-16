'use client';

/**
 * TwoFactorCard — enroll / list / remove a TOTP authenticator. Each mutation runs from
 * the browser client (see lib/supabase/mfa). After a change we re-list factors so the UI
 * reflects reality (never trust optimistic client state after a security change).
 */

import { useState } from 'react';
import { Icon } from '@lar/ui';
import {
  enrollTotp,
  verifyTotp,
  listFactors,
  unenrollFactor,
  assuranceState,
} from '../../lib/supabase/mfa';

interface Factor {
  id: string;
  friendlyName: string;
}
type Phase = 'idle' | 'enrolling' | 'verifying';

export function TwoFactorCard({ initialFactors }: { initialFactors: Factor[] }) {
  const [factors, setFactors] = useState<Factor[]>(initialFactors);
  const [phase, setPhase] = useState<Phase>('idle');
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await listFactors();
    setFactors(
      (data?.totp ?? []).map((f) => ({
        id: f.id,
        friendlyName: f.friendly_name ?? 'Authenticator app',
      })),
    );
  }

  async function startEnroll() {
    setError(null);
    setBusy(true);
    try {
      const { data, error: e } = await enrollTotp();
      if (e || !data) {
        setError(e?.message ?? 'Could not start enrollment.');
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setPhase('verifying');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!factorId || code.trim().length < 6) return;
    setError(null);
    setBusy(true);
    try {
      const { error: e } = await verifyTotp(factorId, code.trim());
      if (e) {
        setError(e.message);
        return;
      }
      setPhase('idle');
      setCode('');
      setQr(null);
      setSecret(null);
      setFactorId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnroll() {
    // Clean up the unverified factor so a stale one doesn't block re-enroll.
    if (factorId) await unenrollFactor(factorId).catch(() => {});
    setPhase('idle');
    setCode('');
    setQr(null);
    setSecret(null);
    setFactorId(null);
    setError(null);
  }

  async function remove(id: string) {
    // Step-up gate: don't let an un-stepped-up (aal1) session strip 2FA. Client-side UX
    // gate — true enforcement is Supabase's "require AAL2 for sensitive ops" setting.
    if ((await assuranceState()) === 'needs_challenge') {
      setError('Complete your 2FA challenge before changing security settings.');
      return;
    }
    if (!window.confirm('Remove this authenticator? You may be asked to set up 2FA again.')) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await unenrollFactor(id);
      if (e) {
        setError(e.message);
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="eyebrow">Two-factor authentication</div>
      <p className="lead" style={{ fontSize: 14.5, marginBottom: 14 }}>
        Add a 6-digit code from an authenticator app as a second factor. Strongly recommended for
        email sign-in.
      </p>

      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}

      {factors.length > 0 && phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {factors.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="check" />
                {f.friendlyName}
              </span>
              <button
                type="button"
                className="btn ghost"
                onClick={() => void remove(f.id)}
                disabled={busy}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {phase === 'verifying' && (
        <div className="np" style={{ marginBottom: 12 }}>
          <p className="lead" style={{ fontSize: 14, marginBottom: 10 }}>
            Scan this in your authenticator app, then enter the 6-digit code.
          </p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="Authenticator QR code"
              width={180}
              height={180}
              style={{ background: '#fff', borderRadius: 12, padding: 8 }}
            />
          )}
          {secret && (
            <p className="note" style={{ marginTop: 8, wordBreak: 'break-all' }}>
              Can&rsquo;t scan? Enter this key: <strong>{secret}</strong>
            </p>
          )}
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="totp-code" className="eyebrow">
              6-digit code
            </label>
            <input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn primary"
              onClick={() => void confirmEnroll()}
              disabled={busy || code.trim().length < 6}
            >
              {busy ? 'Verifying…' : 'Turn on 2FA'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => void cancelEnroll()}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'idle' && (
        <div className="btn-row" style={{ marginTop: factors.length ? 0 : 4 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void startEnroll()}
            disabled={busy}
          >
            <Icon name="lock" />
            {factors.length ? 'Add another authenticator' : 'Add an authenticator app'}
          </button>
        </div>
      )}
    </div>
  );
}
