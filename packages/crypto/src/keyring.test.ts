import { describe, it, expect } from 'vitest';
import { Keyring } from './keyring.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const PASS = 'correct horse battery';

describe('@lar/crypto Keyring (key hierarchy)', () => {
  it('create() yields a live keyring + a wrapped record (master key never in the clear)', async () => {
    const { keyring, record } = await Keyring.create(PASS);
    expect(keyring).toBeInstanceOf(Keyring);
    expect(record).toMatchObject({ v: 1, kdf: 'PBKDF2-SHA256', iter: 600_000 });
    expect(record.salt).toBeTruthy();
    expect(record.iv).toBeTruthy();
    expect(record.ct).toBeTruthy();
  });

  it('seals and opens a value, round-tripping the exact bytes', async () => {
    const { keyring } = await Keyring.create(PASS);
    const sealed = await keyring.seal(enc.encode('hello world'));
    expect(dec.decode(await keyring.open(sealed))).toBe('hello world');
  });

  it('a wrong passphrase cannot unlock the keyring', async () => {
    const { record } = await Keyring.create(PASS);
    await expect(Keyring.unlock(record, 'WRONG passphrase')).rejects.toThrow(
      'wrong passphrase or corrupted keyring',
    );
  });

  it('an unlocked keyring opens records sealed by the original (same master key)', async () => {
    const { keyring: k1, record } = await Keyring.create(PASS);
    const sealed = await k1.seal(enc.encode('shared secret'));

    const k2 = await Keyring.unlock(record, PASS);
    expect(dec.decode(await k2.open(sealed))).toBe('shared secret');
  });

  it('rewrap() changes the passphrase WITHOUT re-encrypting data', async () => {
    const { keyring, record } = await Keyring.create(PASS);
    const sealed = await keyring.seal(enc.encode('keep me'));

    const newRecord = await keyring.rewrap('a brand new passphrase');

    // old passphrase no longer unlocks the new record
    await expect(Keyring.unlock(newRecord, PASS)).rejects.toThrow(/wrong passphrase/);
    // new passphrase does, and the SAME old ciphertext still opens
    const reopened = await Keyring.unlock(newRecord, 'a brand new passphrase');
    expect(dec.decode(await reopened.open(sealed))).toBe('keep me');
    // the original record is untouched and still works with the old passphrase
    const orig = await Keyring.unlock(record, PASS);
    expect(dec.decode(await orig.open(sealed))).toBe('keep me');
  });

  it('the wrapped record contains NO plaintext and a fresh salt/iv each create', async () => {
    const a = await Keyring.create(PASS);
    const b = await Keyring.create(PASS);
    expect(a.record.salt).not.toBe(b.record.salt);
    expect(a.record.iv).not.toBe(b.record.iv);
    expect(a.record.ct).not.toBe(b.record.ct);
    expect(JSON.stringify(a.record)).not.toContain(PASS);
  });

  it('two keyrings are cryptographically isolated', async () => {
    const a = await Keyring.create(PASS);
    const b = await Keyring.create('a different passphrase');
    const sealed = await a.keyring.seal(enc.encode('only for A'));
    // B's master key cannot open A's record (GCM auth failure)
    await expect(b.keyring.open(sealed)).rejects.toThrow();
  });

  it('rejects a weak passphrase on create and unlock', async () => {
    await expect(Keyring.create('short')).rejects.toThrow(/8 characters/);
    const { record } = await Keyring.create(PASS);
    await expect(Keyring.unlock(record, 'short')).rejects.toThrow(/8 characters/);
  });

  it('rejects a malformed keyring record', async () => {
    await expect(Keyring.unlock({ salt: '', iv: '', ct: '' } as never, PASS)).rejects.toThrow(
      'malformed keyring record',
    );
  });

  it('opening a tampered sealed record throws (auth failure)', async () => {
    const { keyring } = await Keyring.create(PASS);
    const sealed = await keyring.seal(enc.encode('intact'));
    const tampered = { iv: sealed.iv, ct: sealed.ct.slice(0, -4) + 'AAAA' };
    await expect(keyring.open(tampered)).rejects.toThrow();
  });
});
