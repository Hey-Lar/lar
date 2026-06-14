import { describe, it, expect } from 'vitest';
import { memoryAdapter, type StorageAdapter } from './adapter.js';
import { createStore, openStore, type SyncableEncryptedStore } from './store.js';
import { createSyncEngine, memoryRemote } from './sync.js';

const PASS = 'correct horse battery';
const KEYRING_KEY = 'lar.store.keyring';

/** A shared, globally-increasing logical clock so cross-device LWW is deterministic. */
function ticker(): () => number {
  let t = 0;
  return () => ++t;
}

async function copyKeyring(from: StorageAdapter, to: StorageAdapter): Promise<void> {
  const k = await from.get(KEYRING_KEY);
  if (k) await to.set(KEYRING_KEY, k);
}

/**
 * Two devices that share ONE identity (the same master key, transferred out-of-band
 * by copying the keyring record) and sync through ONE remote.
 */
async function twoDevices() {
  const clock = ticker();
  const adapterA = memoryAdapter();
  const adapterB = memoryAdapter();
  const a = await createStore(adapterA, PASS, { clock });
  await copyKeyring(adapterA, adapterB); // simulate key transfer to the 2nd device
  const b = await openStore(adapterB, PASS, { clock });
  const remote = memoryRemote();
  return {
    a,
    b,
    remote,
    ea: createSyncEngine(a, remote),
    eb: createSyncEngine(b, remote),
  };
}

describe('@lar/store sync', () => {
  it('propagates a record A → remote → B (and B can decrypt it)', async () => {
    const { a, b, ea, eb } = await twoDevices();
    await a.put('notes', 'n1', { text: 'hello from A' });
    await ea.sync();
    await eb.sync();
    expect(await b.get('notes', 'n1')).toEqual({ text: 'hello from A' });
  });

  it('converges bidirectional edits (each device sees the other’s records)', async () => {
    const { a, b, ea, eb } = await twoDevices();
    await a.put('notes', 'fromA', { v: 'A' });
    await b.put('notes', 'fromB', { v: 'B' });

    await ea.sync();
    await eb.sync();
    await ea.sync();

    expect(await a.get('notes', 'fromB')).toEqual({ v: 'B' });
    expect(await b.get('notes', 'fromA')).toEqual({ v: 'A' });
    expect((await a.list('notes')).sort()).toEqual(['fromA', 'fromB']);
    expect((await b.list('notes')).sort()).toEqual(['fromA', 'fromB']);
  });

  it('resolves a concurrent edit last-write-wins (latest updatedAt survives)', async () => {
    const { a, b, ea, eb } = await twoDevices();
    await a.put('c', 'x', { v: 'init' });
    await ea.sync();
    await eb.sync();
    expect(await b.get('c', 'x')).toEqual({ v: 'init' });

    await a.put('c', 'x', { v: 'A-edit' }); // earlier
    await b.put('c', 'x', { v: 'B-edit' }); // later (ticker advances) → should win

    await ea.sync();
    await eb.sync();
    await ea.sync();
    await eb.sync();

    expect(await a.get('c', 'x')).toEqual({ v: 'B-edit' });
    expect(await b.get('c', 'x')).toEqual({ v: 'B-edit' });
  });

  it('propagates a delete as a tombstone', async () => {
    const { a, b, ea, eb } = await twoDevices();
    await a.put('notes', 'gone', { v: 1 });
    await ea.sync();
    await eb.sync();
    expect(await b.get('notes', 'gone')).toEqual({ v: 1 });

    await a.delete('notes', 'gone');
    await ea.sync();
    await eb.sync();

    expect(await b.get('notes', 'gone')).toBeNull();
    expect(await b.has('notes', 'gone')).toBe(false);
    expect(await b.list('notes')).toEqual([]);
  });

  it('re-creating after a delete brings the record back on both devices', async () => {
    const { a, b, ea, eb } = await twoDevices();
    await a.put('notes', 'x', { v: 'first' });
    await a.delete('notes', 'x');
    await a.put('notes', 'x', { v: 'reborn' }); // newest
    await ea.sync();
    await eb.sync();
    expect(await b.get('notes', 'x')).toEqual({ v: 'reborn' });
  });

  it('the remote only ever holds ciphertext — never plaintext', async () => {
    const { a, ea, remote } = await twoDevices();
    await a.put('secrets', 's1', { value: 'PLAINTEXT-MARKER-XYZ' });
    await ea.sync();
    const dump = JSON.stringify(remote.dump());
    expect(dump).not.toContain('PLAINTEXT-MARKER-XYZ');
    expect(dump).not.toContain(PASS);
    // a change carries iv/ct (sealed) + metadata only
    expect(remote.dump()[0]).toMatchObject({ collection: 'secrets', id: 's1', deleted: false });
    expect(remote.dump()[0]!.ct).toBeTruthy();
  });

  it('batches an offline burst into one sync, and B receives all of it', async () => {
    const { a, b, ea, eb } = await twoDevices();
    for (let i = 0; i < 5; i++) await a.put('notes', `n${i}`, { i });
    const pushResult = await ea.sync(); // one sync pushes the whole burst
    expect(pushResult.pushed).toBe(5);
    await eb.sync();
    expect((await b.list('notes')).length).toBe(5);
    expect(await b.get('notes', 'n3')).toEqual({ i: 3 });
  });

  it('is idempotent — a second sync with no changes does nothing', async () => {
    const { a, ea, eb, b } = await twoDevices();
    await a.put('notes', 'n1', { v: 1 });
    await ea.sync();
    await eb.sync();

    const again = await ea.sync();
    expect(again.pushed).toBe(0);
    expect(again.applied).toBe(0);
    expect(await b.get('notes', 'n1')).toEqual({ v: 1 });
  });

  it('a device that joins later catches up the full history', async () => {
    const clock = ticker();
    const adapterA = memoryAdapter();
    const a = (await createStore(adapterA, PASS, { clock })) as SyncableEncryptedStore;
    const remote = memoryRemote();
    const ea = createSyncEngine(a, remote);
    await a.put('notes', 'n1', { v: 1 });
    await a.put('notes', 'n2', { v: 2 });
    await ea.sync();

    // a brand-new device joins, gets the key, syncs from scratch
    const adapterC = memoryAdapter();
    await copyKeyring(adapterA, adapterC);
    const c = await openStore(adapterC, PASS, { clock });
    const ec = createSyncEngine(c, remote);
    const r = await ec.sync();
    expect(r.applied).toBe(2);
    expect((await c.list('notes')).sort()).toEqual(['n1', 'n2']);
  });
});
