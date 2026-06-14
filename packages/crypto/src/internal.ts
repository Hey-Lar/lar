/**
 * @lar/crypto — shared WebCrypto primitives.
 *
 * Internal building blocks reused by the secret vault (vault.ts) and the
 * key-hierarchy keyring (keyring.ts). Keeping them in ONE place means all
 * cryptography lives in a single audited surface.
 *
 * Isomorphic: browser AND Node ≥20 via globalThis.crypto.subtle. Zero deps.
 */

export const enc = new TextEncoder();
export const dec = new TextDecoder();

export function assertCrypto(): void {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'WebCrypto unavailable — open this page over https, localhost, or file://, or use Node ≥20',
    );
  }
}

/** base64 of any byte buffer (btoa/atob exist in Node 20+ and browsers). */
export function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

export function b64ToBuf(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return globalThis.crypto.getRandomValues(new Uint8Array(n) as Uint8Array<ArrayBuffer>);
}

/**
 * Derive a 256-bit AES-GCM key from a passphrase via PBKDF2-HMAC-SHA-256.
 * Non-extractable; usable only for encrypt/decrypt.
 */
export async function deriveKey(
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

/** Import raw key bytes as a non-extractable AES-GCM key for encrypt/decrypt. */
export async function importAesKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/** AES-256-GCM encrypt with a fresh 12-byte IV. Returns { iv, ct } as base64. */
export async function aesEncrypt(
  key: CryptoKey,
  plaintext: Uint8Array<ArrayBuffer>,
): Promise<{ iv: string; ct: string }> {
  const iv = randomBytes(12);
  const ct = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv: bufToB64(iv), ct: bufToB64(ct) };
}

/** AES-256-GCM decrypt. Throws on auth failure (wrong key / tampered ciphertext). */
export async function aesDecrypt(
  key: CryptoKey,
  ivB64: string,
  ctB64: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(ivB64) },
    key,
    b64ToBuf(ctB64),
  );
  return new Uint8Array(plain) as Uint8Array<ArrayBuffer>;
}
