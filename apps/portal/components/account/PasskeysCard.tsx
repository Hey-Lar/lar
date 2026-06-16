'use client';

/**
 * PasskeysCard — register / list / delete passkeys for the signed-in user. Passkeys are
 * the experimental Supabase WebAuthn API (see lib/supabase/passkeys); fetched client-side
 * because the experimental methods live on the browser client. Degrades gracefully when
 * the browser has no WebAuthn or the feature isn't enabled in the dashboard.
 */

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@lar/ui';
import {
  passkeysSupported,
  registerPasskey,
  listPasskeys,
  deletePasskey,
} from '../../lib/supabase/passkeys';

interface PasskeyRow {
  id: string;
  friendlyName: string;
}

export function PasskeysCard() {
  const supported = passkeysSupported();
  const [rows, setRows] = useState<PasskeyRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: e } = await listPasskeys();
    if (e) {
      // Most likely passkeys aren't enabled in the dashboard yet — show the empty state.
      setError(null);
      setRows([]);
    } else {
      setRows((data ?? []).map((p) => ({ id: p.id, friendlyName: p.friendly_name ?? 'Passkey' })));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (supported) void refresh();
    else setLoaded(true);
  }, [supported, refresh]);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await registerPasskey();
      if (e) {
        setError(e.message);
        return;
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add a passkey.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this passkey? You can no longer sign in with it.')) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await deletePasskey(id);
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
      <div className="eyebrow">Passkeys</div>
      <p className="lead" style={{ fontSize: 14.5, marginBottom: 14 }}>
        Sign in with your fingerprint, face, or device PIN — no code, no password. The most secure
        way in.
      </p>

      {!supported ? (
        <p className="note">This browser doesn&rsquo;t support passkeys.</p>
      ) : (
        <>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          {loaded && rows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {rows.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="lock" />
                    {p.friendlyName}
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void remove(p.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="btn-row" style={{ marginTop: rows.length ? 0 : 4 }}>
            <button type="button" className="btn ghost" onClick={() => void add()} disabled={busy}>
              <Icon name="lock" />
              {busy ? 'Working…' : 'Add a passkey'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
