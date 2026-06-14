/**
 * @lar/store — encrypted backup export / import.
 *
 * Bundles a store's CIPHERTEXT (the passphrase-wrapped keyring + every sealed record)
 * into one portable blob. It contains NO plaintext, NO passphrase, and NO master key —
 * the wrapped keyring can only be opened with the user's passphrase. So a backup is
 * safe to download, email to yourself, or carry to a new device; restoring it + the
 * passphrase reconstitutes the store.
 *
 * This is the data-portability half of the "recovery" decision (the other half — the
 * device-pairing key-transfer crypto — is human-gated and built separately). This
 * module designs no new cryptography; it only serialises already-encrypted bytes.
 */
import type { StorageAdapter } from './adapter.js';
import type { Envelope } from './store.js';

const DEFAULT_NAMESPACE = 'lar.store.';
const BACKUP_VERSION = 1 as const;

export interface BackupOptions {
  namespace?: string;
}

export interface StoreBackup {
  v: typeof BACKUP_VERSION;
  /** The passphrase-wrapped keyring record, verbatim (ciphertext). */
  keyring: string;
  records: Array<{ collection: string; id: string; env: Envelope }>;
}

function keyringKey(ns: string): string {
  return `${ns}keyring`;
}
function recordPrefix(ns: string): string {
  return `${ns}r/`;
}

/**
 * Export everything in a namespace as a portable, ciphertext-only backup.
 * Throws 'no store to back up in this namespace' if there's no keyring.
 */
export async function exportBackup(
  adapter: StorageAdapter,
  opts: BackupOptions = {},
): Promise<StoreBackup> {
  const ns = opts.namespace ?? DEFAULT_NAMESPACE;
  const keyring = await adapter.get(keyringKey(ns));
  if (keyring === null) throw new Error('no store to back up in this namespace');

  const prefix = recordPrefix(ns);
  const keys = (await adapter.keys()).filter((k) => k.startsWith(prefix));
  const records: StoreBackup['records'] = [];
  for (const k of keys) {
    const raw = await adapter.get(k);
    if (raw === null) continue;
    const rest = k.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash < 0) continue;
    let env: Envelope;
    try {
      env = JSON.parse(raw) as Envelope;
    } catch {
      continue; // skip an unparseable record rather than corrupt the whole backup
    }
    records.push({
      collection: decodeURIComponent(rest.slice(0, slash)),
      id: decodeURIComponent(rest.slice(slash + 1)),
      env,
    });
  }
  return { v: BACKUP_VERSION, keyring, records };
}

/** Serialise a backup to a portable string (safe to download — ciphertext only). */
export function backupToBlob(backup: StoreBackup): string {
  return JSON.stringify(backup);
}

function isBackup(v: unknown): v is StoreBackup {
  if (typeof v !== 'object' || v === null) return false;
  const b = v as Record<string, unknown>;
  return (
    b['v'] === BACKUP_VERSION && typeof b['keyring'] === 'string' && Array.isArray(b['records'])
  );
}

/**
 * Restore a backup into a namespace (writes the keyring + every record). The caller
 * then `openStore(adapter, passphrase)` with the ORIGINAL passphrase to use it.
 *
 * Throws:
 *   - 'backup is not valid JSON'
 *   - 'backup is malformed or an unsupported version'
 */
export async function importBackup(
  adapter: StorageAdapter,
  blob: string | StoreBackup,
  opts: BackupOptions = {},
): Promise<{ records: number }> {
  const ns = opts.namespace ?? DEFAULT_NAMESPACE;

  let backup: unknown;
  if (typeof blob === 'string') {
    try {
      backup = JSON.parse(blob);
    } catch {
      throw new Error('backup is not valid JSON');
    }
  } else {
    backup = blob;
  }
  if (!isBackup(backup)) throw new Error('backup is malformed or an unsupported version');

  await adapter.set(keyringKey(ns), backup.keyring);
  let written = 0;
  for (const r of backup.records) {
    if (!r || typeof r.collection !== 'string' || typeof r.id !== 'string') continue;
    await adapter.set(
      `${recordPrefix(ns)}${encodeURIComponent(r.collection)}/${encodeURIComponent(r.id)}`,
      JSON.stringify(r.env),
    );
    written += 1;
  }
  return { records: written };
}
