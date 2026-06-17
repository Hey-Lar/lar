import { describe, it, expect } from 'vitest';
import { Keyring } from './keyring.js';
import {
  generateRecoveryPhrase,
  isValidRecoveryPhrase,
  normalizeRecoveryPhrase,
} from './recovery.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const PASS = 'correct horse battery';

describe('recovery phrase helpers', () => {
  it('generates a valid 12-word BIP39 phrase', () => {
    const phrase = generateRecoveryPhrase();
    expect(phrase.split(' ')).toHaveLength(12);
    expect(isValidRecoveryPhrase(phrase)).toBe(true);
  });

  it('generates a different phrase each time', () => {
    expect(generateRecoveryPhrase()).not.toBe(generateRecoveryPhrase());
  });

  it('normalizes case + whitespace', () => {
    expect(normalizeRecoveryPhrase('  Foo   BAR  baz ')).toBe('foo bar baz');
  });

  it('rejects non-BIP39 input (typos / wrong word count)', () => {
    expect(isValidRecoveryPhrase('this is not a valid recovery phrase')).toBe(false);
    expect(isValidRecoveryPhrase('zzzz zzzz zzzz')).toBe(false);
    expect(isValidRecoveryPhrase('')).toBe(false);
  });
});

describe('Keyring recovery (second way to unlock the master key)', () => {
  it('addRecovery wraps the SAME master key under a generated phrase', async () => {
    const { keyring, record: passRecord } = await Keyring.create(PASS);
    const sealed = await keyring.seal(enc.encode('my private memory'));

    const { phrase, record: recRecord } = await keyring.addRecovery();
    expect(isValidRecoveryPhrase(phrase)).toBe(true);
    // The recovery record is a distinct wrapping (different salt + ciphertext).
    expect(recRecord.salt).not.toBe(passRecord.salt);
    expect(recRecord.ct).not.toBe(passRecord.ct);
  });

  it('BOTH the passphrase and the recovery phrase open the same sealed data', async () => {
    const { keyring, record: passRecord } = await Keyring.create(PASS);
    const sealed = await keyring.seal(enc.encode('my private memory'));
    const { phrase, record: recRecord } = await keyring.addRecovery();

    const viaPass = await Keyring.unlock(passRecord, PASS);
    expect(dec.decode(await viaPass.open(sealed))).toBe('my private memory');

    const viaRecovery = await Keyring.unlockWithRecovery(recRecord, phrase);
    expect(dec.decode(await viaRecovery.open(sealed))).toBe('my private memory');
  });

  it('tolerates messy re-entry (extra spaces, uppercase)', async () => {
    const { keyring } = await Keyring.create(PASS);
    const sealed = await keyring.seal(enc.encode('hello'));
    const { phrase, record } = await keyring.addRecovery();

    const messy = `  ${phrase.toUpperCase().replace(/ /g, '   ')}  `;
    const k = await Keyring.unlockWithRecovery(record, messy);
    expect(dec.decode(await k.open(sealed))).toBe('hello');
  });

  it('a DIFFERENT valid phrase cannot unlock the recovery record', async () => {
    const { keyring } = await Keyring.create(PASS);
    const { record } = await keyring.addRecovery();
    const otherPhrase = generateRecoveryPhrase();
    await expect(Keyring.unlockWithRecovery(record, otherPhrase)).rejects.toThrow(
      'wrong recovery phrase or corrupted record',
    );
  });

  it('an invalid (non-BIP39) phrase is rejected early with a clear error', async () => {
    const { keyring } = await Keyring.create(PASS);
    const { record } = await keyring.addRecovery();
    await expect(
      Keyring.unlockWithRecovery(record, 'this is definitely not a recovery phrase'),
    ).rejects.toThrow('invalid recovery phrase');
  });
});
