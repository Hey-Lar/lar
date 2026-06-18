import { defineConfig } from 'vitest/config';

// The encrypted store derives its key from the passphrase with a deliberately slow
// KDF on every create/open/re-key. Some tests chain several derivations back-to-back
// (e.g. changePassphrase, then reopen with both old and new passphrases), which can
// exceed vitest's 5s default on a loaded CI runner. Give the crypto suite headroom
// rather than weakening the KDF — the cost is the point.
export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
