export interface VaultRecord {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}
