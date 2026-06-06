'use client';

/**
 * VaultPanel — connector-token vault UI.
 *
 * BRIGHT-LINES (never violate):
 *   1. All crypto + storage run in the browser only (guarded by typeof window).
 *   2. The decrypted key is NEVER rendered into JSX text. It is held in a ref,
 *      auto-cleared after 120 s idle, and cleared on unmount.
 *   3. The key and passphrase are NEVER passed to fetch(), console.log(),
 *      postMessage(), or any other exfiltration path.
 *   4. Only the ciphertext VaultRecord is persisted — never the plaintext.
 *   5. No real API key appears in this source file.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { encryptSecret, decryptSecret, createVaultStore } from '@lar/crypto';
import type { VaultStore } from '@lar/crypto';

// ---------------------------------------------------------------------------
// Provider options — labels only; no real key data
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { id: 'trading212', label: 'Trading212 (read-only)' },
  { id: 'polygon', label: 'Polygon.io' },
  { id: 'lumina-snapshot', label: 'Lumina snapshot API' },
  { id: 'custom', label: 'Custom' },
] as const;

type ProviderId = (typeof PROVIDERS)[number]['id'];

// ---------------------------------------------------------------------------
// Auto-clear idle timer duration (ms)
// ---------------------------------------------------------------------------

const AUTO_CLEAR_MS = 120_000; // 120 seconds

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VaultPanel() {
  // Guard: WebCrypto availability (requires secure context: https / localhost)
  const [cryptoReady, setCryptoReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCryptoReady(Boolean(globalThis.crypto?.subtle));
  }, []);

  if (cryptoReady === null) return null; // SSR / first paint — nothing to show server-side

  if (!cryptoReady) {
    return (
      <div className="block-pad">
        <div className="head">
          <div>
            <div className="eyebrow">Vault · browser-only</div>
            <h1 className="h1">Connect</h1>
          </div>
        </div>
        <p className="err">
          WebCrypto is unavailable on this page. Open the portal over <strong>https://</strong> or{' '}
          <strong>localhost</strong> to enable the vault.
        </p>
      </div>
    );
  }

  return <VaultPanelInner />;
}

// ---------------------------------------------------------------------------
// Inner component — only mounts when WebCrypto is confirmed available
// ---------------------------------------------------------------------------

function VaultPanelInner() {
  // --- form state ---
  const [providerId, setProviderId] = useState<ProviderId>('trading212');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [passphraseInput, setPassphraseInput] = useState('');

  // --- feedback ---
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [unlockedInfo, setUnlockedInfo] = useState(''); // confirmation string only — not the key

  // --- stored-key list (provider ids that have a stored record) ---
  const [storedProviders, setStoredProviders] = useState<string[]>([]);

  // --- in-memory unlocked key (ref — never in JSX text) ---
  const unlockedKeyRef = useRef<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- vault store (browser-only) ---
  const storeRef = useRef<VaultStore | null>(null);

  // Initialise store + stored-provider list once, client-side only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    storeRef.current = createVaultStore(window.localStorage);
    refreshStoredList(storeRef.current);
  }, []);

  // Clear the unlocked key on unmount (hard cleanup)
  useEffect(() => {
    return () => {
      clearUnlockedKey();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function refreshStoredList(store: VaultStore) {
    setStoredProviders(store.listProviders());
  }

  function clearUnlockedKey() {
    unlockedKeyRef.current = null;
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }

  function scheduleAutoClear() {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      clearUnlockedKey();
      setUnlockedInfo('');
    }, AUTO_CLEAR_MS);
  }

  function clearMessages() {
    setSuccessMsg('');
    setErrorMsg('');
    setUnlockedInfo('');
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleEncryptAndSave = useCallback(async () => {
    clearMessages();
    const store = storeRef.current;
    if (!store) return;

    // Validation — no real key or passphrase is logged or transmitted
    if (!apiKeyInput.trim()) {
      setErrorMsg('Please enter an API key.');
      return;
    }
    if (passphraseInput.length < 8) {
      setErrorMsg('Passphrase must be at least 8 characters.');
      return;
    }

    try {
      // Encrypt client-side; plaintext never leaves this scope
      const record = await encryptSecret(apiKeyInput, passphraseInput);
      store.save(providerId, record);

      // Clear inputs immediately after encryption
      setApiKeyInput('');
      setPassphraseInput('');
      clearUnlockedKey();
      setUnlockedInfo('');

      refreshStoredList(store);
      setSuccessMsg(
        '🔒 Encrypted & stored on this device — ciphertext only. Never sent to a server.',
      );
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Encryption failed.');
    }
  }, [apiKeyInput, passphraseInput, providerId]);

  const handleUnlock = useCallback(async () => {
    clearMessages();
    const store = storeRef.current;
    if (!store) return;

    if (passphraseInput.length < 8) {
      setErrorMsg('Passphrase must be at least 8 characters.');
      return;
    }

    const entry = store.load(providerId);
    if (!entry) {
      setErrorMsg('No encrypted key found for this provider. Save one first.');
      return;
    }

    try {
      // Decrypt client-side; result stays in ref — never rendered
      const plainKey = await decryptSecret(entry, passphraseInput);

      // NEVER log, transmit, or render the plaintext key
      unlockedKeyRef.current = plainKey;
      scheduleAutoClear();

      // Show confirmation only — length of the key, not the key itself
      setUnlockedInfo(
        `Unlocked ✓ — key is valid (${plainKey.length} chars). Held in memory only. Auto-clears in 120 s.`,
      );
      setPassphraseInput('');
    } catch (e) {
      clearUnlockedKey();
      setUnlockedInfo('');
      setErrorMsg(e instanceof Error ? e.message : 'Decryption failed.');
    }
  }, [passphraseInput, providerId]);

  const handleForget = useCallback(() => {
    clearMessages();
    const store = storeRef.current;
    if (!store) return;

    store.remove(providerId);
    clearUnlockedKey();
    setUnlockedInfo('');
    refreshStoredList(store);
    setSuccessMsg('Key removed from this device.');
  }, [providerId]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const selectedLabel = PROVIDERS.find((p) => p.id === providerId)?.label ?? providerId;
  const isStored = storedProviders.includes(providerId);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="block-pad">
      {/* ── Header ── */}
      <div className="head">
        <div>
          <div className="eyebrow">Browser-only · ciphertext-only</div>
          <h1 className="h1">Connect</h1>
        </div>
        {isStored && (
          <span className="badge live" aria-label="Encrypted key stored on this device">
            Key stored
          </span>
        )}
      </div>

      <p className="lead">
        Paste a read-only API key below. It will be encrypted in this browser and stored only on
        this device &mdash; the plaintext key and your passphrase never leave this screen.
      </p>

      {/* ── Security notice ── */}
      <div className="note vault-note" role="note" aria-label="Security notice">
        Your key is encrypted in THIS browser with a passphrase you choose (AES-256-GCM,
        600,000-round PBKDF2) and stored only on this device. The key and passphrase are never
        transmitted, never logged, and never leave this screen. Use a READ-ONLY, withdrawal-disabled
        key. No server, no recovery &mdash; lose the passphrase, just re-enter the key.
      </div>

      {/* ── Form card ── */}
      <div className="card" style={{ marginTop: 20, marginBottom: 16 }}>
        {/* Provider select */}
        <div className="field">
          <label htmlFor="vault-provider" className="eyebrow">
            Provider
          </label>
          <select
            id="vault-provider"
            value={providerId}
            onChange={(e) => {
              setProviderId(e.target.value as ProviderId);
              clearMessages();
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* API key input (password type — never shown in plaintext after entry) */}
        <div className="field">
          <label htmlFor="vault-apikey" className="eyebrow">
            Read-only API key
          </label>
          <input
            id="vault-apikey"
            type="password"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Paste your read-only key — stays in this browser only"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
        </div>

        {/* Passphrase input */}
        <div className="field">
          <label htmlFor="vault-passphrase" className="eyebrow">
            Vault passphrase{' '}
            <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
              (min 8 chars &mdash; you must remember this)
            </span>
          </label>
          <input
            id="vault-passphrase"
            type="password"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Choose a strong passphrase"
            value={passphraseInput}
            onChange={(e) => setPassphraseInput(e.target.value)}
          />
        </div>

        {/* Feedback */}
        {errorMsg && (
          <p className="err" role="alert">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p className="vault-ok" role="status">
            {successMsg}
          </p>
        )}
        {unlockedInfo && (
          <p className="vault-ok" role="status">
            {unlockedInfo}
          </p>
        )}

        {/* Action buttons */}
        <div className="btn-row">
          <button className="btn primary" type="button" onClick={() => void handleEncryptAndSave()}>
            Encrypt &amp; save
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => void handleUnlock()}
            disabled={!isStored}
          >
            Unlock
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={handleForget}
            disabled={!isStored}
            style={isStored ? { color: 'var(--neg)' } : undefined}
          >
            Forget
          </button>
        </div>
      </div>

      {/* ── Stored keys list ── */}
      {storedProviders.length > 0 && (
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Keys stored on this device
          </div>
          <ul className="vault-stored" role="list">
            {storedProviders.map((id) => {
              const label = PROVIDERS.find((p) => p.id === id)?.label ?? id;
              return (
                <li key={id} className="vault-stored-item">
                  <span className="vault-stored-lock" aria-hidden>
                    &#x1F512;
                  </span>
                  <span className="vault-stored-label">{label}</span>
                  <span className="badge demo" style={{ marginLeft: 'auto' }}>
                    encrypted
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="note" style={{ marginTop: 12 }}>
            Only ciphertext is stored. The plaintext key and passphrase are never persisted.
          </p>
        </div>
      )}
    </div>
  );
}
