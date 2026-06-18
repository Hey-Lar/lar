import { defineConfig } from 'vitest/config';

// The keyring + recovery suites run Argon2/BIP39-grade key derivation, which is
// intentionally expensive. Under load on a CI runner a single derivation can take
// well over a second, and tests that exercise both the passphrase and recovery
// paths can chain a few. Raise the timeout rather than weakening the KDF.
export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
