export interface VaultRecord {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  /** Legacy records may omit iter; decryptSecret falls back to PBKDF2_ITERATIONS. */
  iter?: number;
  salt: string;
  iv: string;
  ct: string;
}
