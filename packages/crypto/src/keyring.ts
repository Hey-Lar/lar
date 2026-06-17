/**
 * @lar/crypto — keyring: the key hierarchy that powers a local-first encrypted store.
 *
 * Why a hierarchy (the Ente / Signal / 1Password pattern):
 *   • A random 256-bit MASTER KEY actually encrypts your data.
 *   • The master key is itself encrypted ("wrapped") by a key DERIVED from your
 *     passphrase (PBKDF2, 600k iterations).
 *
 * This buys three things a naive "PBKDF2 the passphrase per record" design can't:
 *   1. SPEED — the slow 600k-iteration derivation runs ONCE at unlock, not on
 *      every read/write. Records seal/open with the master key directly (fast).
 *   2. PASSPHRASE CHANGE without re-encrypting all data — just re-wrap the one
 *      master key under the new passphrase (rewrap()).
 *   3. RECOVERY (future) — the same master key can be wrapped a second way
 *      (recovery phrase / passkey), so a forgotten passphrase isn't total loss.
 *
 * The master key bytes live in memory only, inside this object's private field.
 * At rest, storage holds ONLY ciphertext — never the passphrase, never the
 * master key, never plaintext.
 */
import type { KeyringRecord, SealedRecord } from './types.js';
import {
  aesDecrypt,
  aesEncrypt,
  assertCrypto,
  b64ToBuf,
  bufToB64,
  deriveKey,
  importAesKey,
  randomBytes,
} from './internal.js';
import { PBKDF2_ITERATIONS, PBKDF2_ITERATIONS_MAX } from './vault.js';
import {
  generateRecoveryPhrase,
  isValidRecoveryPhrase,
  normalizeRecoveryPhrase,
} from './recovery.js';

export type { KeyringRecord, SealedRecord } from './types.js';

const MASTER_KEY_BYTES = 32; // AES-256
const MIN_PASSPHRASE = 8;

function assertPassphrase(passphrase: string): void {
  if (!passphrase || passphrase.length < MIN_PASSPHRASE)
    throw new Error('passphrase must be at least 8 characters');
}

/** Wrap raw master-key bytes under a passphrase-derived key → a portable record. */
async function wrap(master: Uint8Array<ArrayBuffer>, passphrase: string): Promise<KeyringRecord> {
  const salt = randomBytes(16);
  const wrappingKey = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const { iv, ct } = await aesEncrypt(wrappingKey, master);
  return { v: 1, kdf: 'PBKDF2-SHA256', iter: PBKDF2_ITERATIONS, salt: bufToB64(salt), iv, ct };
}

/**
 * A live, unlocked keyring. Holds the master key in memory and seals/opens
 * records with it. Construct via `Keyring.create` (new store) or
 * `Keyring.unlock` (existing store). The raw master key never leaves this object.
 */
export class Keyring {
  readonly #master: Uint8Array<ArrayBuffer>;
  readonly #key: CryptoKey;

  private constructor(master: Uint8Array<ArrayBuffer>, key: CryptoKey) {
    this.#master = master;
    this.#key = key;
  }

  /** Create a brand-new keyring: fresh random master key, wrapped under `passphrase`. */
  static async create(passphrase: string): Promise<{ keyring: Keyring; record: KeyringRecord }> {
    assertCrypto();
    assertPassphrase(passphrase);
    const master = randomBytes(MASTER_KEY_BYTES);
    const record = await wrap(master, passphrase);
    const key = await importAesKey(master);
    return { keyring: new Keyring(master, key), record };
  }

  /** Unlock an existing keyring from its stored record. Throws on a wrong passphrase. */
  static async unlock(record: KeyringRecord, passphrase: string): Promise<Keyring> {
    assertCrypto();
    assertPassphrase(passphrase);
    if (!record?.salt || !record.iv || !record.ct) throw new Error('malformed keyring record');
    const claimed = record.iter ?? PBKDF2_ITERATIONS;
    if (!Number.isFinite(claimed) || claimed < 1 || claimed > PBKDF2_ITERATIONS_MAX)
      throw new Error('malformed keyring record');

    const wrappingKey = await deriveKey(passphrase, b64ToBuf(record.salt), claimed);
    let master: Uint8Array<ArrayBuffer>;
    try {
      master = await aesDecrypt(wrappingKey, record.iv, record.ct);
    } catch {
      throw new Error('wrong passphrase or corrupted keyring');
    }
    const key = await importAesKey(master);
    return new Keyring(master, key);
  }

  /** Re-wrap the SAME master key under a new passphrase — no data re-encryption. */
  async rewrap(newPassphrase: string): Promise<KeyringRecord> {
    assertPassphrase(newPassphrase);
    return wrap(this.#master, newPassphrase);
  }

  /**
   * RECOVERY — wrap the SAME master key a SECOND way, under a freshly generated recovery
   * phrase. Store the returned record beside the passphrase record; show the phrase to the
   * user ONCE (it never leaves the device, we can't see or reset it). A forgotten passphrase
   * no longer means total loss. Idempotent to call again to rotate the phrase.
   */
  async addRecovery(): Promise<{ phrase: string; record: KeyringRecord }> {
    const phrase = generateRecoveryPhrase();
    const record = await wrap(this.#master, normalizeRecoveryPhrase(phrase));
    return { phrase, record };
  }

  /**
   * Unlock from a recovery record + the user's typed recovery phrase. Validates the BIP39
   * checksum first (a typo → "invalid recovery phrase", not a confusing decrypt error).
   */
  static async unlockWithRecovery(record: KeyringRecord, phrase: string): Promise<Keyring> {
    assertCrypto();
    const normalized = normalizeRecoveryPhrase(phrase);
    if (!isValidRecoveryPhrase(normalized)) throw new Error('invalid recovery phrase');
    try {
      return await Keyring.unlock(record, normalized);
    } catch {
      throw new Error('wrong recovery phrase or corrupted record');
    }
  }

  /** Encrypt bytes with the master key (fresh IV each call). */
  async seal(plaintext: Uint8Array<ArrayBuffer>): Promise<SealedRecord> {
    return aesEncrypt(this.#key, plaintext);
  }

  /** Decrypt a sealed record. Throws on auth failure (tampered ciphertext / wrong key). */
  async open(sealed: SealedRecord): Promise<Uint8Array<ArrayBuffer>> {
    if (!sealed?.iv || !sealed.ct) throw new Error('malformed sealed record');
    return aesDecrypt(this.#key, sealed.iv, sealed.ct);
  }
}
