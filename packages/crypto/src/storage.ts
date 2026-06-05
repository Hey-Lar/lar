/**
 * @lar/crypto — localStorage-bound vault store.
 *
 * Pluggable behind VaultStorage so the crypto core stays environment-agnostic.
 * In the browser, pass `localStorage`. In tests, pass an in-memory mock.
 *
 * IMPORTANT: save() writes ONLY the ciphertext record — never plaintext or
 * the passphrase. The passphrase must stay in memory only, for the encrypt /
 * decrypt call duration.
 */
import type { VaultRecord } from './types.js';

export interface VaultStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  key(i: number): string | null;
  readonly length: number;
}

export interface StoredEntry extends VaultRecord {
  provider: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface VaultStore {
  save(id: string, record: VaultRecord, meta?: Record<string, unknown>): void;
  load(id: string): StoredEntry | null;
  remove(id: string): void;
  listProviders(): string[];
}

function isStoredEntry(v: unknown): v is StoredEntry {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r['salt'] === 'string' &&
    r['salt'].length > 0 &&
    typeof r['iv'] === 'string' &&
    r['iv'].length > 0 &&
    typeof r['ct'] === 'string' &&
    r['ct'].length > 0
  );
}

/**
 * Create a namespaced vault store backed by the given VaultStorage.
 *
 * @param storage - Any storage implementing the VaultStorage interface (e.g. localStorage).
 * @param prefix  - Key namespace. Defaults to 'lar.vault.'.
 */
export function createVaultStore(storage: VaultStorage, prefix = 'lar.vault.'): VaultStore {
  return {
    /**
     * Persist the ciphertext record for a provider. Never call this with
     * plaintext — always encrypt with encryptSecret first.
     */
    save(id: string, record: VaultRecord, meta?: Record<string, unknown>): void {
      const payload: StoredEntry = {
        ...record,
        provider: id,
        createdAt: new Date().toISOString(),
        ...(meta ?? {}),
      };
      storage.setItem(prefix + id, JSON.stringify(payload));
    },

    load(id: string): StoredEntry | null {
      const raw = storage.getItem(prefix + id);
      if (!raw) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null;
      }
      return isStoredEntry(parsed) ? parsed : null;
    },

    remove(id: string): void {
      storage.removeItem(prefix + id);
    },

    listProviders(): string[] {
      const out: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k?.startsWith(prefix)) out.push(k.slice(prefix.length));
      }
      return out;
    },
  };
}
