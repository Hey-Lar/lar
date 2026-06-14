export interface VaultRecord {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  /** Legacy records may omit iter; decryptSecret falls back to PBKDF2_ITERATIONS. */
  iter?: number;
  salt: string;
  iv: string;
  ct: string;
}

/**
 * The wrapped master key persisted by a keyring. Structurally a VaultRecord
 * whose ciphertext is the master key bytes (not a user secret).
 */
export interface KeyringRecord {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iter?: number;
  salt: string;
  iv: string;
  ct: string;
}

/** A value encrypted under the master key — just IV + ciphertext (no KDF). */
export interface SealedRecord {
  iv: string;
  ct: string;
}
