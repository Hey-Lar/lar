import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, PBKDF2_ITERATIONS, PBKDF2_ITERATIONS_MAX } from './vault.js';
import { createVaultStore } from './storage.js';
import type { VaultStorage } from './storage.js';

describe('@lar/crypto vault (WebCrypto)', () => {
  it('exposes the API and PBKDF2_ITERATIONS === 600000', () => {
    expect(typeof encryptSecret).toBe('function');
    expect(typeof decryptSecret).toBe('function');
    expect(PBKDF2_ITERATIONS).toBe(600_000);
  });

  it('round-trips a secret with the correct passphrase', async () => {
    const secret = 'rk-read-only-EXAMPLE-not-real';
    const rec = await encryptSecret(secret, 'correct horse battery');
    expect(await decryptSecret(rec, 'correct horse battery')).toBe(secret);
  });

  it('stores ONLY ciphertext — never the plaintext secret', async () => {
    const secret = 'rk-PLAINTEXT-MARKER-123';
    const rec = await encryptSecret(secret, 'correct horse battery');
    const serialized = JSON.stringify(rec);
    expect(serialized).not.toContain('PLAINTEXT-MARKER');
    expect(serialized).not.toContain(secret);
  });

  it('emits a self-describing record (v, kdf, iter, salt, iv, ct)', async () => {
    const rec = await encryptSecret('x'.repeat(20), 'correct horse battery');
    expect(rec).toMatchObject({ v: 1, kdf: 'PBKDF2-SHA256', iter: 600_000 });
    expect(rec.salt).toBeTruthy();
    expect(rec.iv).toBeTruthy();
    expect(rec.ct).toBeTruthy();
  });

  it('rejects a wrong passphrase (GCM auth failure, not garbage)', async () => {
    const rec = await encryptSecret('secret-value', 'correct horse battery');
    await expect(decryptSecret(rec, 'WRONG passphrase')).rejects.toThrow(
      'wrong passphrase or corrupted vault',
    );
  });

  it('rejects a weak passphrase (< 8 chars)', async () => {
    await expect(encryptSecret('secret', 'short')).rejects.toThrow(/8 characters/);
  });

  it('uses a fresh salt + IV per encryption (no reuse)', async () => {
    const a = await encryptSecret('same', 'correct horse battery');
    const b = await encryptSecret('same', 'correct horse battery');
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('decrypts a legacy record without iter (falls back to 600k)', async () => {
    const rec = await encryptSecret('value', 'correct horse battery');
    // simulate an older record without `iter`
    const legacy = { v: rec.v, salt: rec.salt, iv: rec.iv, ct: rec.ct };
    expect(
      await decryptSecret(legacy as Parameters<typeof decryptSecret>[0], 'correct horse battery'),
    ).toBe('value');
  });

  it('exposes a hard PBKDF2_ITERATIONS_MAX ceiling above today’s default', () => {
    expect(PBKDF2_ITERATIONS_MAX).toBeGreaterThan(PBKDF2_ITERATIONS);
    expect(PBKDF2_ITERATIONS_MAX).toBeLessThanOrEqual(10_000_000);
  });

  it('rejects a tampered record whose iter exceeds the ceiling (DoS hardening)', async () => {
    const rec = await encryptSecret('value', 'correct horse battery');
    const tampered = { ...rec, iter: PBKDF2_ITERATIONS_MAX + 1 };
    await expect(decryptSecret(tampered, 'correct horse battery')).rejects.toThrow(
      'malformed vault record',
    );
  });

  it('rejects a tampered record whose iter is non-finite or non-positive', async () => {
    const rec = await encryptSecret('value', 'correct horse battery');
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const tampered = { ...rec, iter: bad as number };
      await expect(decryptSecret(tampered, 'correct horse battery')).rejects.toThrow(
        'malformed vault record',
      );
    }
  });
});

describe('createVaultStore', () => {
  function makeMemStorage(): VaultStorage {
    const store: Record<string, string> = {};
    return {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      },
      removeItem: (k) => {
        delete store[k];
      },
      key: (i) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    };
  }

  it('saves and loads a vault record, storing ciphertext only', async () => {
    const storage = makeMemStorage();
    const vault = createVaultStore(storage);
    const rec = await encryptSecret('my-api-key', 'correct horse battery');
    vault.save('provider-a', rec);

    const loaded = vault.load('provider-a');
    expect(loaded).not.toBeNull();
    // ciphertext fields present
    expect(loaded!.ct).toBeTruthy();
    expect(loaded!.salt).toBeTruthy();
    expect(loaded!.iv).toBeTruthy();
    // never stores plaintext
    const raw = JSON.stringify(loaded);
    expect(raw).not.toContain('my-api-key');
    expect(raw).not.toContain('correct horse battery');
  });

  it('listProviders returns saved provider ids', async () => {
    const storage = makeMemStorage();
    const vault = createVaultStore(storage);
    const rec = await encryptSecret('secret', 'correct horse battery');
    vault.save('alpha', rec);
    vault.save('beta', rec);

    const providers = vault.listProviders();
    expect(providers).toContain('alpha');
    expect(providers).toContain('beta');
  });

  it('remove deletes the provider', async () => {
    const storage = makeMemStorage();
    const vault = createVaultStore(storage);
    const rec = await encryptSecret('secret', 'correct horse battery');
    vault.save('to-delete', rec);
    vault.remove('to-delete');
    expect(vault.load('to-delete')).toBeNull();
    expect(vault.listProviders()).not.toContain('to-delete');
  });

  it('load returns null for tampered JSON missing required fields', () => {
    const storage = makeMemStorage();
    const vault = createVaultStore(storage);
    // seed a structurally invalid JSON object directly into the backing store
    storage.setItem('lar.vault.tampered', '{"not":"a record"}');
    expect(vault.load('tampered')).toBeNull();
  });

  it('load returns null for non-JSON garbage without throwing', () => {
    const storage = makeMemStorage();
    const vault = createVaultStore(storage);
    storage.setItem('lar.vault.garbage', 'not json at all }{');
    expect(() => vault.load('garbage')).not.toThrow();
    expect(vault.load('garbage')).toBeNull();
  });
});
