/**
 * The brand-critical guarantee, as one end-to-end guard: HeyLar's most personal data
 * NEVER appears as plaintext anywhere it could leak — not on disk, not on the sync
 * wire, not in a backup file. Each layer has its own ciphertext-only test; this one
 * proves the WHOLE chain together can't leak, so a future change to any path is caught.
 *
 * If this test ever fails, the privacy promise is broken — treat it as a sev-0.
 */
import { describe, it, expect } from 'vitest';
import { memoryAdapter, type StorageAdapter } from './adapter.js';
import { createStore, openStore } from './store.js';
import { createSyncEngine, memoryRemote } from './sync.js';
import { exportBackup, backupToBlob } from './backup.js';

const PASS = 'a-very-secret-passphrase-9821';
const MARKERS = [
  'PLAINTEXT-NOTE-MARKER-0xA1',
  'PLAINTEXT-DECISION-MARKER-0xB2',
  'PLAINTEXT-NESTED-MARKER-0xC3',
];

async function dumpAdapter(adapter: StorageAdapter): Promise<string> {
  const keys = await adapter.keys();
  const values = await Promise.all(keys.map((k) => adapter.get(k)));
  return JSON.stringify({ keys, values });
}

function assertNoLeak(haystack: string, where: string): void {
  for (const m of MARKERS) expect(haystack, `${m} leaked into ${where}`).not.toContain(m);
  expect(haystack, `passphrase leaked into ${where}`).not.toContain(PASS);
}

describe('@lar/store privacy — no plaintext leaks across the whole chain', () => {
  it('keeps plaintext out of disk, the sync wire, AND the backup — end to end', async () => {
    const deviceA = memoryAdapter();
    const store = await createStore(deviceA, PASS);
    await store.put('notes', 'n1', { text: MARKERS[0] });
    await store.put('decisions', 'd1', { text: MARKERS[1], rationale: 'because' });
    await store.put('deep', 'x', { a: { b: [{ secret: MARKERS[2] }] } });

    // 1) at rest on device A
    assertNoLeak(await dumpAdapter(deviceA), 'device-A localStorage');

    // 2) on the sync wire + in the remote's store
    const remote = memoryRemote();
    await createSyncEngine(store, remote).sync();
    assertNoLeak(JSON.stringify(remote.dump()), 'the sync remote');

    // 3) after the change lands on a 2nd device's disk (still ciphertext)
    const deviceB = memoryAdapter();
    // simulate key transfer (the wrapped keyring is itself ciphertext)
    await deviceB.set('lar.store.keyring', await deviceA.get('lar.store.keyring'));
    const b = await openStore(deviceB, PASS);
    await createSyncEngine(b, remote).sync();
    assertNoLeak(await dumpAdapter(deviceB), 'device-B localStorage');

    // 4) in an exported backup blob
    const blob = backupToBlob(await exportBackup(deviceA));
    assertNoLeak(blob, 'the backup blob');

    // ...and the data is still genuinely there (the markers DO decrypt with the key)
    expect(await b.get('notes', 'n1')).toEqual({ text: MARKERS[0] });
    expect(await b.get('deep', 'x')).toEqual({ a: { b: [{ secret: MARKERS[2] }] } });
  });
});
