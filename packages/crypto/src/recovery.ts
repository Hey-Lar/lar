/**
 * Recovery phrase — the SECOND way to unlock your master key, so a forgotten passphrase
 * isn't total data loss (the brand-defining failure mode: "the company got bought and now
 * my data is gone"). A BIP39 mnemonic is high-entropy, human-transcribable, and its checksum
 * catches typos on re-entry. The phrase never leaves the device; it just wraps the same
 * master key a second way (see Keyring.addRecovery / Keyring.unlockWithRecovery).
 *
 * Uses @scure/bip39 + the English wordlist (audited, MIT, zero-runtime-dep — the noble/scure
 * family). CRYPTO is human-gated: this is a reviewable draft, exhaustively unit-tested.
 */
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

/** A fresh 12-word recovery phrase (128 bits of entropy). */
export function generateRecoveryPhrase(): string {
  return generateMnemonic(wordlist, 128);
}

/** Canonicalize user-typed input: NFKD, trim, lowercase, single-space the words. */
export function normalizeRecoveryPhrase(raw: string): string {
  return raw.normalize('NFKD').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Is this a valid BIP39 phrase (known words + correct checksum)? Catches typos early. */
export function isValidRecoveryPhrase(raw: string): boolean {
  return validateMnemonic(normalizeRecoveryPhrase(raw), wordlist);
}
