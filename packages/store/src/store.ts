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
 *
 * Sync-aware: every record carries minimal metadata — `u` (updatedAt, ms) and
 * `d` (deleted tombstone) — so a SyncEngine can reconcile devices last-write-wins.
 * Deletes are SOFT (tombstones) so they propagate. The metadata is plaintext (the
 * remote learns "record X changed at time T", never WHAT it is); the value stays
 * sealed. See sync.ts + docs/19-sync-architecture.md.
 */
import { Keyring, type KeyringRecord, type SealedRecord } from '@lar/crypto';
import type { StorageAdapter } from './adapter.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

const DEFAULT_NAMESPACE = 'lar.store.';

/** The on-disk envelope: a sealed value + sync metadata. Only `iv`/`ct` are secret. */
export interface Envelope {
  iv: string;
  ct: string;
  /** updatedAt, epoch ms — the last-write-wins ordering key. */
  u: number;
  /** deleted tombstone. Absent/false = live. */
  d?: boolean;
}

/** A wall clock injectable for tests (real code uses Date.now). */
export type Clock = () => number;

export interface StoreOptions {
  /** Key namespace in the adapter. Lets multiple stores share one backend. */
  namespace?: string;
  /** Clock for updatedAt stamps. Defaults to Date.now. */
  clock?: Clock;
}

export interface EncryptedStore {
  /** Encrypt + persist a JSON-serialisable value under collection/id. */
  put<T>(collection: string, id: string, value: T): Promise<void>;
  /** Decrypt + return the value, or null if absent/deleted. Throws if tampered. */
  get<T = unknown>(collection: string, id: string): Promise<T | null>;
  /** True if a live record exists at collection/id. */
  has(collection: string, id: string): Promise<boolean>;
  /** The ids of live records in a collection. */
  list(collection: string): Promise<string[]>;
  /** Every { id, value } of live records in a collection (decrypted). */
  entries<T = unknown>(collection: string): Promise<Array<{ id: string; value: T }>>;
  /** Soft-delete one record (writes a tombstone so the delete can sync). */
  delete(collection: string, id: string): Promise<void>;
  /** Soft-delete every record in a collection. */
  clear(collection: string): Promise<void>;
  /** Re-wrap the master key under a new passphrase (no data re-encryption). */
  changePassphrase(current: string, next: string): Promise<void>;
  /** Drop the master key from memory. Further operations throw until reopened. */
  lock(): void;
  /** Whether the store currently holds the master key in memory. */
  readonly unlocked: boolean;
}

/**
 * The sync-facing surface a SyncEngine needs. Operates on sealed envelopes +
 * metadata only — it never decrypts. Kept separate from the app-facing
 * EncryptedStore so app code doesn't see it.
 */
export interface SyncableStore {
  /** Every record's sealed envelope + identity (incl. tombstones). */
  scanEnvelopes(): Promise<Array<{ collection: string; id: string; env: Envelope }>>;
  /** One record's envelope, or null. */
  readEnvelope(collection: string, id: string): Promise<Envelope | null>;
  /** Write an envelope verbatim (used to apply a remote change). */
  writeEnvelope(collection: string, id: string, env: Envelope): Promise<void>;
  /** Persisted, namespaced sync bookkeeping (per remote). */
  readSyncState(remoteId: string): Promise<string | null>;
  writeSyncState(remoteId: string, json: string): Promise<void>;
}

export type SyncableEncryptedStore = EncryptedStore & SyncableStore;

function assertKey(label: string, value: string): void {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error(`${label} must be a non-empty string`);
}

function parseEnvelope(raw: string): Envelope {
  let env: Envelope;
  try {
    env = JSON.parse(raw) as Envelope;
  } catch {
    throw new Error('corrupted record (not valid JSON)');
  }
  if (typeof env?.iv !== 'string' || typeof env.ct !== 'string')
    throw new Error('corrupted record (missing ciphertext)');
  // Legacy/partial envelopes (no metadata) read as live with updatedAt 0.
  if (typeof env.u !== 'number') env.u = 0;
  return env;
}

class Store implements SyncableEncryptedStore {
  #keyring: Keyring | null;
  readonly #adapter: StorageAdapter;
  readonly #ns: string;
  readonly #now: Clock;

  constructor(adapter: StorageAdapter, keyring: Keyring, namespace: string, clock: Clock) {
    this.#adapter = adapter;
    this.#keyring = keyring;
    this.#ns = namespace;
    this.#now = clock;
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

  get #recordPrefix(): string {
    return `${this.#ns}r/`;
  }

  #collectionPrefix(collection: string): string {
    assertKey('collection', collection);
    return `${this.#ns}r/${encodeURIComponent(collection)}/`;
  }

  #parseRecordKey(key: string): { collection: string; id: string } | null {
    if (!key.startsWith(this.#recordPrefix)) return null;
    const rest = key.slice(this.#recordPrefix.length);
    const slash = rest.indexOf('/');
    if (slash < 0) return null;
    return {
      collection: decodeURIComponent(rest.slice(0, slash)),
      id: decodeURIComponent(rest.slice(slash + 1)),
    };
  }

  async put<T>(collection: string, id: string, value: T): Promise<void> {
    const ring = this.#ring();
    const sealed = await ring.seal(enc.encode(JSON.stringify(value)));
    const env: Envelope = { iv: sealed.iv, ct: sealed.ct, u: this.#now(), d: false };
    await this.#adapter.set(this.#recordKey(collection, id), JSON.stringify(env));
  }

  async get<T = unknown>(collection: string, id: string): Promise<T | null> {
    const ring = this.#ring();
    const raw = await this.#adapter.get(this.#recordKey(collection, id));
    if (raw === null) return null;
    const env = parseEnvelope(raw);
    if (env.d) return null; // tombstone
    const plain = dec.decode(await ring.open({ iv: env.iv, ct: env.ct } satisfies SealedRecord));
    return JSON.parse(plain) as T;
  }

  async has(collection: string, id: string): Promise<boolean> {
    const raw = await this.#adapter.get(this.#recordKey(collection, id));
    if (raw === null) return false;
    return !parseEnvelope(raw).d;
  }

  async list(collection: string): Promise<string[]> {
    const prefix = this.#collectionPrefix(collection);
    const keys = (await this.#adapter.keys()).filter((k) => k.startsWith(prefix));
    const out: string[] = [];
    for (const k of keys) {
      const raw = await this.#adapter.get(k);
      if (raw === null) continue;
      if (parseEnvelope(raw).d) continue; // skip tombstones
      out.push(decodeURIComponent(k.slice(prefix.length)));
    }
    return out;
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
    const ring = this.#ring();
    // Tombstone: seal a placeholder so the envelope stays a valid sealed record,
    // mark d=true, bump updatedAt so the delete wins/loses by last-write.
    const sealed = await ring.seal(enc.encode('null'));
    const env: Envelope = { iv: sealed.iv, ct: sealed.ct, u: this.#now(), d: true };
    await this.#adapter.set(this.#recordKey(collection, id), JSON.stringify(env));
  }

  async clear(collection: string): Promise<void> {
    for (const id of await this.list(collection)) await this.delete(collection, id);
  }

  async changePassphrase(current: string, next: string): Promise<void> {
    const ring = this.#ring();
    const raw = await this.#adapter.get(keyringKey(this.#ns));
    if (raw === null) throw new Error('no keyring to re-key');
    await Keyring.unlock(JSON.parse(raw) as KeyringRecord, current);
    const record = await ring.rewrap(next);
    await this.#adapter.set(keyringKey(this.#ns), JSON.stringify(record));
  }

  lock(): void {
    this.#keyring = null;
  }

  // ── SyncableStore (sealed-envelope surface; no decryption) ────────────────

  async scanEnvelopes(): Promise<Array<{ collection: string; id: string; env: Envelope }>> {
    const keys = (await this.#adapter.keys()).filter((k) => k.startsWith(this.#recordPrefix));
    const out: Array<{ collection: string; id: string; env: Envelope }> = [];
    for (const k of keys) {
      const ident = this.#parseRecordKey(k);
      if (!ident) continue;
      const raw = await this.#adapter.get(k);
      if (raw === null) continue;
      out.push({ ...ident, env: parseEnvelope(raw) });
    }
    return out;
  }

  async readEnvelope(collection: string, id: string): Promise<Envelope | null> {
    const raw = await this.#adapter.get(this.#recordKey(collection, id));
    return raw === null ? null : parseEnvelope(raw);
  }

  async writeEnvelope(collection: string, id: string, env: Envelope): Promise<void> {
    await this.#adapter.set(this.#recordKey(collection, id), JSON.stringify(env));
  }

  async readSyncState(remoteId: string): Promise<string | null> {
    return this.#adapter.get(`${this.#ns}sync/${encodeURIComponent(remoteId)}`);
  }

  async writeSyncState(remoteId: string, json: string): Promise<void> {
    await this.#adapter.set(`${this.#ns}sync/${encodeURIComponent(remoteId)}`, json);
  }
}

function keyringKey(namespace: string): string {
  return `${namespace}keyring`;
}

/**
 * Wrap a clock so it is STRICTLY increasing per store instance — two writes in the
 * same millisecond still get distinct, ordered `updatedAt`s, so local last-write-wins
 * never ties. (Cross-device same-ms ties are resolved deterministically by the remote;
 * a hybrid logical clock is the future upgrade — see docs/19-sync-architecture.md.)
 */
function monotonic(base: Clock): Clock {
  let last = 0;
  return () => {
    const t = Math.max(base(), last + 1);
    last = t;
    return t;
  };
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
): Promise<SyncableEncryptedStore> {
  const ns = opts.namespace ?? DEFAULT_NAMESPACE;
  if ((await readKeyringRecord(adapter, ns)) !== null)
    throw new Error('a store already exists in this namespace');
  const { keyring, record } = await Keyring.create(passphrase);
  await adapter.set(keyringKey(ns), JSON.stringify(record));
  return new Store(adapter, keyring, ns, monotonic(opts.clock ?? Date.now));
}

/**
 * Open an EXISTING encrypted store. Throws if none exists, or on a wrong passphrase.
 */
export async function openStore(
  adapter: StorageAdapter,
  passphrase: string,
  opts: StoreOptions = {},
): Promise<SyncableEncryptedStore> {
  const ns = opts.namespace ?? DEFAULT_NAMESPACE;
  const record = await readKeyringRecord(adapter, ns);
  if (record === null) throw new Error('no store exists in this namespace');
  const keyring = await Keyring.unlock(record, passphrase);
  return new Store(adapter, keyring, ns, monotonic(opts.clock ?? Date.now));
}

/** Open the store if it exists, otherwise create it. Convenience for single-user apps. */
export async function openOrCreateStore(
  adapter: StorageAdapter,
  passphrase: string,
  opts: StoreOptions = {},
): Promise<SyncableEncryptedStore> {
  const ns = opts.namespace ?? DEFAULT_NAMESPACE;
  const exists = (await readKeyringRecord(adapter, ns)) !== null;
  return exists ? openStore(adapter, passphrase, opts) : createStore(adapter, passphrase, opts);
}
