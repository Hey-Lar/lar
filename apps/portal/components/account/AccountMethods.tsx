'use client';

/**
 * AccountMethods — shows which sign-in methods are connected to this account, and the
 * sign-out controls. Read-only on the linking side for now: Supabase auto-links the same
 * verified email across Google/Apple/email to ONE user, and manual linking stays OFF until
 * we ship a guarded "connect account" flow (privacy-first default). Sign-out uses the
 * documented scopes (this device vs everywhere).
 */

import { useState } from 'react';
import { Icon } from '@lar/ui';
import { createClient } from '../../lib/supabase/client';

const METHODS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'google', label: 'Google' },
  { id: 'apple', label: 'Apple' },
  { id: 'email', label: 'Email magic link' },
  { id: 'phone', label: 'Phone' },
];

export function AccountMethods({ connectedProviders }: { connectedProviders: string[] }) {
  const [busy, setBusy] = useState(false);
  const connected = new Set(connectedProviders);

  async function signOut(scope: 'local' | 'global') {
    setBusy(true);
    try {
      await createClient().auth.signOut({ scope });
    } finally {
      if (typeof window !== 'undefined') window.location.assign('/login');
    }
  }

  return (
    <div className="card">
      <div className="eyebrow">Sign-in methods</div>
      <p className="lead" style={{ fontSize: 14.5, marginBottom: 14 }}>
        Methods connected to this account. Signing in with the same verified email links to one
        space automatically.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {METHODS.map((m) => {
          const on = connected.has(m.id);
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span>{m.label}</span>
              <span
                className="note"
                style={{ color: on ? 'var(--teal)' : 'var(--ink-faint)', fontWeight: 600 }}
              >
                {on ? 'Connected' : 'Not connected'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Sessions
      </div>
      <div className="btn-row" style={{ marginTop: 0 }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => void signOut('local')}
          disabled={busy}
        >
          <Icon name="power" />
          Sign out
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => void signOut('global')}
          disabled={busy}
        >
          Sign out everywhere
        </button>
      </div>
    </div>
  );
}
