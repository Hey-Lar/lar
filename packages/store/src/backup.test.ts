import { describe, it, expect } from 'vitest';
import { memoryAdapter } from './adapter.js';
import { createStore, openStore } from './store.js';
import { exportBackup, importBackup, backupToBlob } from './backup.js';

const PASS = 'correct horse battery';

describe('@lar/store backup', () => {
  it('exports a ciphertext-only backup (keyring + records, no plaintext)', async () => {
    const adapter = memoryAdapter();
    const store = await createStore(adapter, PASS);
    await store.put('notes', 'n1', { text: 'PLAINTEXT-MARKER-XYZ' });

    const backup = await exportBackup(adapter);
    expect(backup.v).toBe(1);
    expect(typeof backup.keyring).toBe('string');
    expect(backup.records).toHaveLength(1);
    expect(backup.records[0]).toMatchObject({ collection: 'notes', id: 'n1' });

    const blob = backupToBlob(backup);
    expect(blob).not.toContain('PLAINTEXT-MARKER-XYZ');
    expect(blob).not.toContain(PASS);
  });

  it('round-trips: export → import into a fresh device → unlock → data decrypts', async () => {
    const src = memoryAdapter();
    const store = await createStore(src, PASS);
    await store.put('notes', 'n1', { text: 'restore me', tags: [1, 2] });
    await store.put('decisions', 'd1', { text: 'shipped sync' });

    const blob = backupToBlob(await exportBackup(src));

    const dst = memoryAdapter();
    const result = await importBackup(dst, blob);
    expect(result.records).toBe(2);

    const restored = await openStore(dst, PASS);
    expect(await restored.get('notes', 'n1')).toEqual({ text: 'restore me', tags: [1, 2] });
    expect(await restored.get('decisions', 'd1')).toEqual({ text: 'shipped sync' });
  });

  it('a wrong passphrase still cannot open a restored backup', async () => {
    const src = memoryAdapter();
    const store = await createStore(src, PASS);
    await store.put('notes', 'n1', { v: 1 });
    const dst = memoryAdapter();
    await importBackup(dst, await exportBackup(src));
    await expect(openStore(dst, 'WRONG passphrase here')).rejects.toThrow(/wrong passphrase/);
  });

  it('accepts the backup object directly (not just a string)', async () => {
    const src = memoryAdapter();
    const store = await createStore(src, PASS);
    await store.put('notes', 'n1', { v: 1 });
    const dst = memoryAdapter();
    await importBackup(dst, await exportBackup(src)); // object form
    const restored = await openStore(dst, PASS);
    expect(await restored.get('notes', 'n1')).toEqual({ v: 1 });
  });

  it('export throws when there is no store in the namespace', async () => {
    await expect(exportBackup(memoryAdapter())).rejects.toThrow(/no store to back up/);
  });

  it('import rejects non-JSON and malformed/unsupported backups', async () => {
    await expect(importBackup(memoryAdapter(), 'not json {')).rejects.toThrow(/not valid JSON/);
    await expect(importBackup(memoryAdapter(), '{"v":999}')).rejects.toThrow(
      /malformed|unsupported/,
    );
    await expect(
      importBackup(memoryAdapter(), JSON.stringify({ v: 1, keyring: 123, records: [] })),
    ).rejects.toThrow(/malformed|unsupported/);
  });

  it('respects the namespace option', async () => {
    const src = memoryAdapter();
    const store = await createStore(src, PASS, { namespace: 'work.' });
    await store.put('notes', 'n1', { scope: 'work' });

    const dst = memoryAdapter();
    await importBackup(dst, await exportBackup(src, { namespace: 'work.' }), {
      namespace: 'work.',
    });
    const restored = await openStore(dst, PASS, { namespace: 'work.' });
    expect(await restored.get('notes', 'n1')).toEqual({ scope: 'work' });
  });
});
