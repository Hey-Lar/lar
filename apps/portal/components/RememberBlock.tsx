'use client';

/**
 * RememberBlock — Lar's private, on-device encrypted memory.
 *
 * Proves @lar/store end-to-end in the real app: notes you ask Lar to remember
 * are sealed with AES-256-GCM under a passphrase only you hold, and persisted to
 * localStorage as CIPHERTEXT ONLY. No backend, works offline. Lar never sees them.
 *
 * BRIGHT-LINES:
 *   1. All crypto + storage run in the browser only (WebCrypto guarded).
 *   2. The passphrase is held in state only long enough to unlock, then cleared.
 *      It is never logged, never sent to fetch(), never persisted.
 *   3. Only ciphertext is written to localStorage — never plaintext, never the key.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@lar/ui';
import { webStorageAdapter, openOrCreateStore } from '@lar/store';
import type { EncryptedStore } from '@lar/store';
import { summarizeRemember, type RememberItem } from '../lib/remember-digest';

const NAMESPACE = 'lar.remember.';
const COLLECTION = 'notes';
const DECISIONS = 'decisions';

interface Note {
  id: string;
  text: string;
  createdAt: string;
}

interface Decision {
  id: string;
  text: string;
  rationale: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export function RememberBlock() {
  const [cryptoReady, setCryptoReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCryptoReady(Boolean(globalThis.crypto?.subtle));
  }, []);

  if (cryptoReady === null) return null; // SSR / first paint
  if (!cryptoReady) {
    return (
      <div className="block-pad">
        <div className="head">
          <div>
            <div className="eyebrow">Private · on-device</div>
            <h1 className="h1">Remember</h1>
          </div>
        </div>
        <p className="err">
          WebCrypto is unavailable here. Open the portal over <strong>https://</strong> or{' '}
          <strong>localhost</strong> to use your private memory.
        </p>
      </div>
    );
  }

  return <RememberInner />;
}

function RememberInner() {
  const storeRef = useRef<EncryptedStore | null>(null);

  const [unlocked, setUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [decisionText, setDecisionText] = useState('');
  const [decisionWhy, setDecisionWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Deterministic on-device digest over notes + decisions (the personal-context layer).
  const digest = useMemo(() => {
    const items: RememberItem[] = [
      ...notes.map((n): RememberItem => ({ ...n, kind: 'note' })),
      ...decisions.map(
        (d): RememberItem => ({
          id: d.id,
          kind: 'decision',
          text: d.text,
          createdAt: d.createdAt,
          rationale: d.rationale,
          status: d.status,
        }),
      ),
    ];
    return summarizeRemember(items, Date.now());
  }, [notes, decisions]);
  const peak = Math.max(1, ...digest.last7Days.map((d) => d.count));

  // Auto-lock on unmount: drop the master key from memory.
  useEffect(() => {
    return () => {
      storeRef.current?.lock();
      storeRef.current = null;
    };
  }, []);

  const refresh = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return;
    const [noteEntries, decisionEntries] = await Promise.all([
      store.entries<Note>(COLLECTION),
      store.entries<Decision>(DECISIONS),
    ]);
    setNotes(
      noteEntries.map((e) => e.value).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
    setDecisions(
      decisionEntries.map((e) => e.value).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }, []);

  const handleUnlock = useCallback(async () => {
    setError('');
    if (passphrase.length < 8) {
      setError('Use a passphrase of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const adapter = webStorageAdapter(window.localStorage);
      storeRef.current = await openOrCreateStore(adapter, passphrase, { namespace: NAMESPACE });
      setPassphrase(''); // clear the passphrase from state once unlocked
      setUnlocked(true);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unlock.');
    } finally {
      setBusy(false);
    }
  }, [passphrase, refresh]);

  const handleRemember = useCallback(async () => {
    const store = storeRef.current;
    const text = noteText.trim();
    if (!store || !text) return;
    setBusy(true);
    try {
      const note: Note = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
      await store.put(COLLECTION, note.id, note);
      setNoteText('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }, [noteText, refresh]);

  const handleLogDecision = useCallback(async () => {
    const store = storeRef.current;
    const text = decisionText.trim();
    if (!store || !text) return;
    setBusy(true);
    try {
      const d: Decision = {
        id: crypto.randomUUID(),
        text,
        rationale: decisionWhy.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      await store.put(DECISIONS, d.id, d);
      setDecisionText('');
      setDecisionWhy('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log the decision.');
    } finally {
      setBusy(false);
    }
  }, [decisionText, decisionWhy, refresh]);

  const handleToggleDecision = useCallback(
    async (d: Decision) => {
      const store = storeRef.current;
      if (!store) return;
      const next: Decision = { ...d, status: d.status === 'open' ? 'resolved' : 'open' };
      await store.put(DECISIONS, d.id, next);
      await refresh();
    },
    [refresh],
  );

  const handleForget = useCallback(
    async (collection: string, id: string) => {
      const store = storeRef.current;
      if (!store) return;
      await store.delete(collection, id);
      await refresh();
    },
    [refresh],
  );

  const handleLock = useCallback(() => {
    storeRef.current?.lock();
    storeRef.current = null;
    setUnlocked(false);
    setNotes([]);
    setDecisions([]);
    setNoteText('');
    setDecisionText('');
    setDecisionWhy('');
  }, []);

  // ── Locked screen ──
  if (!unlocked) {
    return (
      <div className="block-pad">
        <div className="head">
          <div>
            <div className="eyebrow">Private · on-device · end-to-end encrypted</div>
            <h1 className="h1">Remember</h1>
          </div>
          <span className="badge demo" aria-hidden>
            <Icon name="lock" size={16} />
          </span>
        </div>

        <p className="lead">
          A private memory only you can open. Anything you ask Lar to remember is encrypted on this
          device with a passphrase you choose &mdash; Lar never sees it.
        </p>

        <div className="card" style={{ marginTop: 20, maxWidth: 460 }}>
          <div className="field">
            <label htmlFor="remember-pass" className="eyebrow">
              Passphrase{' '}
              <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                (min 8 chars &mdash; first time sets it)
              </span>
            </label>
            <input
              id="remember-pass"
              type="password"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Your passphrase — stays on this device"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleUnlock();
              }}
            />
          </div>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <div className="btn-row">
            <button
              className="btn primary"
              type="button"
              onClick={() => void handleUnlock()}
              disabled={busy}
            >
              {busy ? 'Unlocking…' : 'Unlock'}
            </button>
          </div>
        </div>

        <div className="note vault-note" role="note" style={{ marginTop: 16, maxWidth: 460 }}>
          Encrypted in THIS browser (AES-256-GCM, 600,000-round PBKDF2) and stored only on this
          device. No server, no recovery &mdash; if you forget the passphrase, the notes can't be
          read.
        </div>
      </div>
    );
  }

  // ── Unlocked screen ──
  return (
    <div className="block-pad">
      <div className="head">
        <div>
          <div className="eyebrow">Unlocked · encrypted on this device</div>
          <h1 className="h1">Remember</h1>
        </div>
        <button className="btn ghost" type="button" onClick={handleLock}>
          <Icon name="lock" size={16} /> Lock
        </button>
      </div>

      {/* ── Digest: the personal-context layer, computed on-device ── */}
      <div className="card" style={{ marginTop: 16, maxWidth: 620 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Your memory · on-device
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <span>
            <strong style={{ fontSize: 22 }}>{digest.notes}</strong> notes
          </span>
          <span>
            <strong style={{ fontSize: 22 }}>{digest.decisions}</strong> decisions
          </span>
          <span>
            <strong style={{ fontSize: 22 }}>{digest.openDecisions}</strong> open
          </span>
          <span style={{ marginLeft: 'auto', opacity: 0.7 }}>{digest.addedToday} added today</span>
        </div>
        <div
          style={{ display: 'flex', gap: 4, marginTop: 14, alignItems: 'flex-end', height: 30 }}
          aria-hidden
        >
          {digest.last7Days.map((d) => (
            <span
              key={d.day}
              title={`${d.day}: ${d.count}`}
              style={{
                flex: 1,
                height: `${Math.round((d.count / peak) * 100)}%`,
                minHeight: 3,
                background: 'var(--hearth)',
                opacity: d.count ? 0.85 : 0.22,
                borderRadius: 3,
              }}
            />
          ))}
        </div>
        <p className="note" style={{ marginTop: 10 }}>
          Last 7 days · everything here is encrypted on this device. Lar never sees it.
        </p>
      </div>

      <div className="card" style={{ marginTop: 16, marginBottom: 16, maxWidth: 620 }}>
        <div className="field">
          <label htmlFor="remember-note" className="eyebrow">
            Something for Lar to remember
          </label>
          <input
            id="remember-note"
            type="text"
            placeholder="e.g. My passport expires in March"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleRemember();
            }}
          />
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <div className="btn-row">
          <button
            className="btn primary"
            type="button"
            onClick={() => void handleRemember()}
            disabled={busy || noteText.trim().length === 0}
          >
            Remember
          </button>
        </div>
      </div>

      <div className="eyebrow" style={{ maxWidth: 620, marginBottom: 8 }}>
        Notes
      </div>
      {notes.length === 0 ? (
        <p className="note" style={{ maxWidth: 620 }}>
          Nothing remembered yet. Add your first private note above.
        </p>
      ) : (
        <ul className="vault-stored" role="list" style={{ maxWidth: 620 }}>
          {notes.map((n) => (
            <li key={n.id} className="vault-stored-item">
              <span className="vault-stored-lock" aria-hidden>
                <Icon name="lock" size={16} />
              </span>
              <span className="vault-stored-label">{n.text}</span>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void handleForget(COLLECTION, n.id)}
                aria-label={`Forget note: ${n.text}`}
                style={{ marginLeft: 'auto', color: 'var(--neg)' }}
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Decisions journal ── */}
      <div className="card" style={{ marginTop: 20, marginBottom: 16, maxWidth: 620 }}>
        <div className="field">
          <label htmlFor="decision-text" className="eyebrow">
            Log a decision
          </label>
          <input
            id="decision-text"
            type="text"
            placeholder="What did you decide?"
            value={decisionText}
            onChange={(e) => setDecisionText(e.target.value)}
          />
        </div>
        <div className="field">
          <label
            htmlFor="decision-why"
            className="eyebrow"
            style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}
          >
            Why (optional)
          </label>
          <input
            id="decision-why"
            type="text"
            placeholder="The reasoning you'll want to remember later"
            value={decisionWhy}
            onChange={(e) => setDecisionWhy(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleLogDecision();
            }}
          />
        </div>
        <div className="btn-row">
          <button
            className="btn primary"
            type="button"
            onClick={() => void handleLogDecision()}
            disabled={busy || decisionText.trim().length === 0}
          >
            Log decision
          </button>
        </div>
      </div>

      {decisions.length > 0 && (
        <ul className="vault-stored" role="list" style={{ maxWidth: 620 }}>
          {decisions.map((d) => (
            <li key={d.id} className="vault-stored-item" style={{ alignItems: 'flex-start' }}>
              <span className="vault-stored-lock" aria-hidden>
                <Icon name="lock" size={16} />
              </span>
              <span className="vault-stored-label">
                <span
                  style={{
                    textDecoration: d.status === 'resolved' ? 'line-through' : 'none',
                    opacity: d.status === 'resolved' ? 0.6 : 1,
                  }}
                >
                  {d.text}
                </span>
                {d.rationale && (
                  <span className="note" style={{ display: 'block', marginTop: 2 }}>
                    {d.rationale}
                  </span>
                )}
              </span>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void handleToggleDecision(d)}
                style={{ marginLeft: 'auto' }}
                aria-label={d.status === 'open' ? `Resolve: ${d.text}` : `Reopen: ${d.text}`}
              >
                {d.status === 'open' ? 'Resolve' : 'Reopen'}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void handleForget(DECISIONS, d.id)}
                aria-label={`Forget decision: ${d.text}`}
                style={{ color: 'var(--neg)' }}
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="note" style={{ marginTop: 12, maxWidth: 620 }}>
        {digest.total} items · stored as ciphertext only. Lar never sees these.
      </p>
    </div>
  );
}
