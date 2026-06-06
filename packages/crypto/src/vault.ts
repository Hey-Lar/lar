/**
 * @lar/crypto — client-side secret vault (WebCrypto, isomorphic).
 *
 * Runs in browser AND Node ≥20 via globalThis.crypto.subtle.
 * Zero runtime dependencies — WebCrypto only.
 *
 * Crypto:
 *   • PBKDF2-HMAC-SHA-256, 600 000 iterations (OWASP 2023 floor) derives a
 *     256-bit AES-GCM key from the passphrase + a random 16-byte salt.
 *   • AES-256-GCM with a random 12-byte IV — GCM auth tag makes a wrong
 *     passphrase throw rather than returning garbage.
 *   • Fresh salt + IV per encryption call.
 */
import type { VaultRecord } from './types.js';

export { type VaultRecord } from './types.js';

export const PBKDF2_ITERATIONS = 600_000;

/**
 * Hard ceiling on PBKDF2 iterations honoured at decrypt time. Defends
 * against a local-only DoS where an attacker with write access to the
 * stored vault record (e.g. a tampered localStorage value) bumps `iter`
 * to e.g. 10^9 so every unlock spins the CPU for hours.
 *
 * 5,000,000 is ~8× the current default — leaves room for future floor
 * increases without forcing an immediate code change while still being
 * survivable on commodity hardware (one decrypt ≈ a few seconds).
 *
 * Pre-condition for this attack is that an attacker already controls
 * the storage; the clamp turns "trivial denial-of-service" into "no
 * effect at all".
 */
export const PBKDF2_ITERATIONS_MAX = 5_000_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function assertCrypto(): void {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'WebCrypto unavailable — open this page over https, localhost, or file://, or use Node ≥20',
    );
  }
}

// --- base64 helpers (ArrayBuffer <-> string, global btoa/atob work in Node 20+ and browsers) ---
function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function b64ToBuf(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt `secret` under `passphrase`. Returns a portable, self-describing
 * record { v, kdf, iter, salt, iv, ct } — all base64. Safe to JSON.stringify.
 *
 * Throws:
 *   - 'nothing to encrypt'                  — if secret is empty
 *   - 'passphrase must be at least 8 characters' — if passphrase is too short
 */
export async function encryptSecret(secret: string, passphrase: string): Promise<VaultRecord> {
  assertCrypto();
  if (!secret) throw new Error('nothing to encrypt');
  if (!passphrase || passphrase.length < 8)
    throw new Error('passphrase must be at least 8 characters');

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16) as Uint8Array<ArrayBuffer>);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12) as Uint8Array<ArrayBuffer>);
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const ct = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(secret),
  );

  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: PBKDF2_ITERATIONS,
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    ct: bufToB64(ct),
  };
}

/**
 * Decrypt a record produced by encryptSecret.
 *
 * Throws:
 *   - 'malformed vault record'               — missing salt / iv / ct
 *   - 'wrong passphrase or corrupted vault'  — GCM auth failure
 */
export async function decryptSecret(record: VaultRecord, passphrase: string): Promise<string> {
  assertCrypto();
  if (!record?.salt || !record.iv || !record.ct) throw new Error('malformed vault record');

  const salt = b64ToBuf(record.salt);
  const iv = b64ToBuf(record.iv);
  // Honour the record's claimed iter (legacy records may omit it → 600k)
  // but reject anything beyond the hard ceiling — a tampered storage
  // entry asking for 10^9 iterations would otherwise lock the CPU for
  // hours per unlock attempt.
  const claimed = record.iter ?? PBKDF2_ITERATIONS;
  if (!Number.isFinite(claimed) || claimed < 1 || claimed > PBKDF2_ITERATIONS_MAX) {
    throw new Error('malformed vault record');
  }
  const iterations = claimed;
  const key = await deriveKey(passphrase, salt, iterations);

  let plain: ArrayBuffer;
  try {
    plain = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      b64ToBuf(record.ct),
    );
  } catch {
    throw new Error('wrong passphrase or corrupted vault');
  }
  return dec.decode(plain);
}
