'use client';

/**
 * PhoneSignIn — two-step SMS OTP (enter phone → enter 6-digit code). Unlike OAuth/email,
 * phone verifyOtp returns the session directly in the browser (no /auth/confirm hop).
 * Only rendered when the 'phone' method is enabled (needs a configured SMS provider).
 * Numbers must be E.164 (+countrycode…). Add CAPTCHA before exposing this publicly.
 */

import { useState } from 'react';
import { Icon } from '@lar/ui';
import { createClient } from '../lib/supabase/client';

export function PhoneSignIn() {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const p = phone.trim();
    if (!p) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await createClient().auth.signInWithOtp({ phone: p });
      if (err) {
        setError(err.message);
        return;
      }
      setStep('code');
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await createClient().auth.verifyOtp({
        phone: phone.trim(),
        token: code.trim(),
        type: 'sms',
      });
      if (err) {
        setError(err.message);
        return;
      }
      if (typeof window !== 'undefined') window.location.assign('/');
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="np" onSubmit={step === 'phone' ? sendCode : verify} noValidate>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      {step === 'phone' ? (
        <>
          <div className="field">
            <label htmlFor="signin-phone" className="eyebrow">
              Phone
            </label>
            <input
              id="signin-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+15551234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="btn-row" style={{ marginTop: 4 }}>
            <button type="submit" className="btn ghost" disabled={busy || phone.trim().length < 6}>
              <Icon name="lock" />
              {busy ? 'Sending…' : 'Text me a code'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="signin-sms-code" className="eyebrow">
              6-digit code
            </label>
            <input
              id="signin-sms-code"
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
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
              disabled={busy}
            >
              Change number
            </button>
          </div>
        </>
      )}
    </form>
  );
}
