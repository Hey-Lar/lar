/**
 * @lar/store — a local-first, end-to-end encrypted document store.
 *
 * The heart of "your data stays yours": every value is encrypted on-device with
 * a master key only the user's passphrase can unlock (via @lar/crypto's Keyring).
 * Works fully offline, no backend. At rest the storage holds ONLY ciphertext —
 * no plaintext, no passphrase, no master key.
 *
 * Shape: a simple collection / id / JSON-value document store.
 *   await store.put('notes', 'n1', { text: 'hello' });
 *   await store.get('notes', 'n1');         // → { text: 'hello' }
 *   await store.list('notes');              // → ['n1']
 *
 * Performance: the slow passphrase derivation (PBKDF2, 600k) runs ONCE at open.
 * Every put/get seals/opens with the in-memory master key — fast.
 */
import { Keyring, type KeyringRecord, type SealedRecord } from '@lar/crypto';
import type { StorageAdapter } from './adapter.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

const DEFAULT_NAMESPACE = 'lar.store.';

export interface StoreOptions {
  /** Key namespace in the adapter. Lets multiple stores share one backend. */
  namespace?: string;
}

export interface EncryptedStore {
  /** Encrypt + persist a JSON-serialisable value under collection/id. */
  put<T>(collection: string, id: string, value: T): Promise<void>;
  /** Decrypt + return the value, or null if absent. Throws if tampered. */
  get<T = unknown>(collection: string, id: string): Promise<T | null>;
  /** True if a record exists at collection/id. */
  has(collection: string, id: string): Promise<boolean>;
  /** The ids present in a collection. */
  list(collection: string): Promise<string[]>;
  /** Every { id, value } in a collection (decrypted). */
  entries<T = unknown>(collection: string): Promise<Array<{ id: string; value: T }>>;
  /** Delete one record. */
  delete(collection: string, id: string): Promise<void>;
  /** Delete every record in a collection. */
  clear(collection: string): Promise<void>;
  /** Re-wrap the master key under a new passphrase (no data re-encryption). */
  changePassphrase(current: string, next: string): Promise<void>;
  /** Drop the master key from memory. Further operations throw until reopened. */
  lock(): void;
  /** Whether the store currently holds the master key in memory. */
  readonly unlocked: boolean;
}

function assertKey(label: string, value: string): void {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error(`${label} must be a non-empty string`);
}

class Store implements EncryptedStore {
  #keyring: Keyring | null;
  readonly #adapter: StorageAdapter;
  readonly #ns: string;

  constructor(adapter: StorageAdapter, keyring: Keyring, namespace: string) {
    this.#adapter = adapter;
    this.#keyring = keyring;
    this.#ns = namespace;
  }

  get unlocked(): boolean {
    return this.#keyring !== null;
  }

  #ring(): Keyring {
    if (!this.#keyring) throw new Error('store is locked');
    return this.#keyring;
  }

  #recordKey(collection: string, id: string): string {
    assertKey('collection', collection);
    assertKey('id', id);
    return `${this.#ns}r/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
  }

  #collectionPrefix(collection: string): string {
    assertKey('collection', collection);
    return `${this.#ns}r/${encodeURIComponent(collection)}/`;
  }

  async put<T>(collection: string, id: string, value: T): Promise<void> {
    const ring = this.#ring();
    const sealed = await ring.seal(enc.encode(JSON.stringify(value)));
    await this.#adapter.set(this.#recordKey(collection, id), JSON.stringify(sealed));
  }

  async get<T = unknown>(collection: string, id: string): Promise<T | null> {
    const ring = this.#ring();
    const raw = await this.#adapter.get(this.#recordKey(collection, id));
    if (raw === null) return null;
    let sealed: SealedRecord;
    try {
      sealed = JSON.parse(raw) as SealedRecord;
    } catch {
      throw new Error('corrupted record (not valid JSON)');
    }
    const plain = dec.decode(await ring.open(sealed));
    return JSON.parse(plain) as T;
  }

  async has(collection: string, id: string): Promise<boolean> {
    return (await this.#adapter.get(this.#recordKey(collection, id))) !== null;
  }

  async list(collection: string): Promise<string[]> {
    const prefix = this.#collectionPrefix(collection);
    const keys = await this.#adapter.keys();
    return keys
      .filter((k) => k.startsWith(prefix))
      .map((k) => decodeURIComponent(k.slice(prefix.length)));
  }

  async entries<T = unknown>(collection: string): Promise<Array<{ id: string; value: T }>> {
    const ids = await this.list(collection);
    const out: Array<{ id: string; value: T }> = [];
    for (const id of ids) {
      const value = await this.get<T>(collection, id);
      if (value !== null) out.push({ id, value });
    }
    return out;
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.#adapter.remove(this.#recordKey(collection, id));
  }

  async clear(collection: string): Promise<void> {
    const prefix = this.#collectionPrefix(collection);
    const keys = await this.#adapter.keys();
    for (const k of keys) if (k.startsWith(prefix)) await this.#adapter.remove(k);
  }

  async changePassphrase(current: string, next: string): Promise<void> {
    const ring = this.#ring();
    const raw = await this.#adapter.get(keyringKey(this.#ns));
    if (raw === null) throw new Error('no keyring to re-key');
    // Verify `current` actually unlocks the stored keyring before re-wrapping —
    // an already-unlocked session must still prove knowledge of the old passphrase.
    await Keyring.unlock(JSON.parse(raw) as KeyringRecord, current);
    const record = await ring.rewrap(next);
    await this.#adapter.set(keyringKey(this.#ns), JSON.stringify(record));
  }

  lock(): void {
    this.#keyring = null;
  }
}

function keyringKey(namespace: string): string {
  return `${namespace}keyring`;
}

async function readKeyringRecord(
  adapter: StorageAdapter,
  namespace: string,
): Promise<KeyringRecord | null> {
  const raw = await adapter.get(keyringKey(namespace));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as KeyringRecord;
  } catch {
    throw new Error('corrupted keyring record');
  }
}

/**
 * Create a NEW encrypted store. Throws if one already exists in this namespace
 * (use `openStore` to unlock an existing one, or `openOrCreateStore`).
 */
export async function createStore(
  adapter: StorageAdapter,
  passphrase: string,
  opts: StoreOptions = {},
): Promise<EncryptedStore> {
  const ns = opts.namespace ?? DEFAULT_NAMESPACE;
  if ((await readKeyringRecord(adapter, ns)) !== null)
    throw new Error('a store already exists in this namespace');
  const { keyring, record } = await Keyring.create(passphrase);
  await adapter.set(keyringKey(ns), JSON.stringify(record));
  return new Store(adapter, keyring, ns);
}

/**
 * Open an EXISTING encrypted store. Throws if none exists, or on a wrong passphrase.
 */
export async function openStore(
  adapter: StorageAdapter,
  passphrase: string,
  opts: StoreOptions = {},
): Promise<EncryptedStore> {
  const ns = opts.namespace ?? DEFAULT_NAMESPACE;
  const record = await readKeyringRecord(adapter, ns);
  if (record === null) throw new Error('no store exists in this namespace');
  const keyring = await Keyring.unlock(record, passphrase);
  return new Store(adapter, keyring, ns);
}

/** Open the store if it exists, otherwise create it. Convenience for single-user apps. */
export async function openOrCreateStore(
  adapter: StorageAdapter,
  passphrase: string,
  opts: StoreOptions = {},
): Promise<EncryptedStore> {
  const ns = opts.namespace ?? DEFAULT_NAMESPACE;
  const exists = (await readKeyringRecord(adapter, ns)) !== null;
  return exists ? openStore(adapter, passphrase, opts) : createStore(adapter, passphrase, opts);
}
