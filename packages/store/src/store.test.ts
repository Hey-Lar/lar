import { describe, it, expect } from 'vitest';
import { memoryAdapter } from './adapter.js';
import { createStore, openStore, openOrCreateStore } from './store.js';

const PASS = 'correct horse battery';

describe('@lar/store EncryptedStore', () => {
  it('round-trips a JSON value through encryption', async () => {
    const store = await createStore(memoryAdapter(), PASS);
    await store.put('notes', 'n1', { text: 'hello', tags: ['a', 'b'], n: 42 });
    expect(await store.get('notes', 'n1')).toEqual({ text: 'hello', tags: ['a', 'b'], n: 42 });
  });

  it('get() returns null for a missing record', async () => {
    const store = await createStore(memoryAdapter(), PASS);
    expect(await store.get('notes', 'nope')).toBeNull();
    expect(await store.has('notes', 'nope')).toBe(false);
  });

  it('stores ONLY ciphertext — no plaintext anywhere in the backend', async () => {
    const adapter = memoryAdapter();
    const store = await createStore(adapter, PASS);
    await store.put('secrets', 's1', { value: 'PLAINTEXT-MARKER-XYZ' });

    const dump = JSON.stringify(
      await Promise.all((await adapter.keys()).map((k) => adapter.get(k))),
    );
    expect(dump).not.toContain('PLAINTEXT-MARKER-XYZ');
    expect(dump).not.toContain(PASS);
  });

  it('list() and entries() enumerate a collection', async () => {
    const store = await createStore(memoryAdapter(), PASS);
    await store.put('notes', 'a', { v: 1 });
    await store.put('notes', 'b', { v: 2 });
    await store.put('other', 'c', { v: 3 });

    expect((await store.list('notes')).sort()).toEqual(['a', 'b']);
    expect(await store.list('other')).toEqual(['c']);
    const entries = (await store.entries<{ v: number }>('notes')).sort((x, y) =>
      x.id.localeCompare(y.id),
    );
    expect(entries).toEqual([
      { id: 'a', value: { v: 1 } },
      { id: 'b', value: { v: 2 } },
    ]);
  });

  it('delete() and clear() remove records', async () => {
    const store = await createStore(memoryAdapter(), PASS);
    await store.put('notes', 'a', { v: 1 });
    await store.put('notes', 'b', { v: 2 });

    await store.delete('notes', 'a');
    expect(await store.get('notes', 'a')).toBeNull();
    expect(await store.list('notes')).toEqual(['b']);

    await store.clear('notes');
    expect(await store.list('notes')).toEqual([]);
  });

  it('persists across re-open with the same adapter + passphrase', async () => {
    const adapter = memoryAdapter();
    const a = await createStore(adapter, PASS);
    await a.put('notes', 'n1', { kept: true });
    a.lock();

    const b = await openStore(adapter, PASS);
    expect(await b.get('notes', 'n1')).toEqual({ kept: true });
  });

  it('a wrong passphrase cannot open the store', async () => {
    const adapter = memoryAdapter();
    await createStore(adapter, PASS);
    await expect(openStore(adapter, 'WRONG passphrase here')).rejects.toThrow(/wrong passphrase/);
  });

  it('createStore refuses to clobber an existing store; openStore needs one', async () => {
    const adapter = memoryAdapter();
    await createStore(adapter, PASS);
    await expect(createStore(adapter, PASS)).rejects.toThrow(/already exists/);

    await expect(openStore(memoryAdapter(), PASS)).rejects.toThrow(/no store exists/);
  });

  it('openOrCreateStore creates first time, opens second time', async () => {
    const adapter = memoryAdapter();
    const first = await openOrCreateStore(adapter, PASS);
    await first.put('notes', 'n1', { hi: 1 });
    first.lock();

    const second = await openOrCreateStore(adapter, PASS);
    expect(await second.get('notes', 'n1')).toEqual({ hi: 1 });
  });

  it('lock() drops the key — further operations throw until reopened', async () => {
    const store = await createStore(memoryAdapter(), PASS);
    expect(store.unlocked).toBe(true);
    store.lock();
    expect(store.unlocked).toBe(false);
    await expect(store.put('notes', 'n1', { v: 1 })).rejects.toThrow('store is locked');
    await expect(store.get('notes', 'n1')).rejects.toThrow('store is locked');
  });

  it('changePassphrase re-keys without losing data; old passphrase stops working', async () => {
    const adapter = memoryAdapter();
    const store = await createStore(adapter, PASS);
    await store.put('notes', 'n1', { keep: 'me' });

    await store.changePassphrase(PASS, 'a brand new passphrase');

    // old passphrase no longer opens a fresh handle
    await expect(openStore(adapter, PASS)).rejects.toThrow(/wrong passphrase/);
    // new one does, and the data survived (master key unchanged)
    const reopened = await openStore(adapter, 'a brand new passphrase');
    expect(await reopened.get('notes', 'n1')).toEqual({ keep: 'me' });
  });

  it('changePassphrase rejects a wrong current passphrase', async () => {
    const store = await createStore(memoryAdapter(), PASS);
    await expect(store.changePassphrase('WRONG current pass', 'next passphrase')).rejects.toThrow(
      /wrong passphrase/,
    );
  });

  it('namespaces isolate independent stores in one backend', async () => {
    const adapter = memoryAdapter();
    const work = await createStore(adapter, PASS, { namespace: 'work.' });
    const home = await createStore(adapter, 'a different passphrase', { namespace: 'home.' });
    await work.put('notes', 'n1', { scope: 'work' });
    await home.put('notes', 'n1', { scope: 'home' });

    expect(await work.get('notes', 'n1')).toEqual({ scope: 'work' });
    expect(await home.get('notes', 'n1')).toEqual({ scope: 'home' });
  });

  it('handles ids/collections with slashes and unicode safely', async () => {
    const store = await createStore(memoryAdapter(), PASS);
    await store.put('a/b', 'id/with/slashes 🔐', { ok: true });
    expect(await store.get('a/b', 'id/with/slashes 🔐')).toEqual({ ok: true });
    expect(await store.list('a/b')).toEqual(['id/with/slashes 🔐']);
  });

  it('rejects empty collection or id', async () => {
    const store = await createStore(memoryAdapter(), PASS);
    await expect(store.put('', 'id', { v: 1 })).rejects.toThrow(/collection must be/);
    await expect(store.put('c', '', { v: 1 })).rejects.toThrow(/id must be/);
  });

  it('throws on a tampered (re-sealed) record rather than returning garbage', async () => {
    const adapter = memoryAdapter();
    const store = await createStore(adapter, PASS);
    await store.put('notes', 'n1', { v: 'intact' });

    // corrupt the ciphertext of the stored record
    const key = (await adapter.keys()).find((k) => k.includes('/n1'))!;
    const rec = JSON.parse((await adapter.get(key))!) as { iv: string; ct: string };
    await adapter.set(key, JSON.stringify({ iv: rec.iv, ct: rec.ct.slice(0, -4) + 'AAAA' }));

    await expect(store.get('notes', 'n1')).rejects.toThrow();
  });

  it('preserves value types (string, number, boolean, null, nested)', async () => {
    const store = await createStore(memoryAdapter(), PASS);
    const value = { s: 'x', n: 3.14, b: false, nil: null, arr: [1, { deep: true }] };
    await store.put('c', 'id', value);
    expect(await store.get('c', 'id')).toEqual(value);
  });
});
