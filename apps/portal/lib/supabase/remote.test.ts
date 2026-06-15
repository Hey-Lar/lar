import { describe, it, expect } from 'vitest';
import type { Change } from '@lar/store';
import { supabaseRemote, type RpcClient } from './remote';

/** A fake RPC client that records calls and returns canned responses. */
function fakeClient(responses: {
  push?: { data: unknown; error: { message: string } | null };
  pull?: { data: unknown; error: { message: string } | null };
}) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client: RpcClient = {
    async rpc(fn, args) {
      calls.push({ fn, args });
      if (fn === 'lar_push') return responses.push ?? { data: 0, error: null };
      if (fn === 'lar_pull') return responses.pull ?? { data: [], error: null };
      return { data: null, error: { message: `unknown rpc ${fn}` } };
    },
  };
  return { client, calls };
}

const change = (over: Partial<Change> = {}): Change => ({
  collection: 'notes',
  id: 'n1',
  iv: 'aXY=',
  ct: 'Y3Q=',
  updatedAt: 1000,
  deleted: false,
  ...over,
});

describe('supabaseRemote (SyncRemote ↔ lar_push/lar_pull)', () => {
  it('push sends changes to lar_push and returns the cursor', async () => {
    const { client, calls } = fakeClient({ push: { data: 42, error: null } });
    const remote = supabaseRemote(client);
    const changes = [change(), change({ id: 'n2', updatedAt: 1001 })];

    const result = await remote.push(changes);

    expect(result).toEqual({ cursor: 42 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ fn: 'lar_push', args: { changes } });
  });

  it('push normalizes a bigint cursor returned as a string', async () => {
    const { client } = fakeClient({ push: { data: '9007199254740', error: null } });
    const result = await supabaseRemote(client).push([change()]);
    expect(result.cursor).toBe(9007199254740);
  });

  it('push with no changes still calls lar_push and returns the cursor', async () => {
    const { client, calls } = fakeClient({ push: { data: 7, error: null } });
    const result = await supabaseRemote(client).push([]);
    expect(result).toEqual({ cursor: 7 });
    expect(calls[0]).toEqual({ fn: 'lar_push', args: { changes: [] } });
  });

  it('pull maps snake_case rows → RemoteChange[] and computes the cursor as max seq', async () => {
    const rows = [
      {
        collection: 'notes',
        id: 'n1',
        iv: 'aXY=',
        ct: 'Y3Q=',
        updated_at: '1000',
        deleted: false,
        seq: 5,
      },
      {
        collection: 'notes',
        id: 'n2',
        iv: 'aXY2',
        ct: 'Y3Q2',
        updated_at: 1200,
        deleted: true,
        seq: '8',
      },
    ];
    const { client, calls } = fakeClient({ pull: { data: rows, error: null } });

    const { changes, cursor } = await supabaseRemote(client).pull(3);

    expect(calls[0]).toEqual({ fn: 'lar_pull', args: { since: 3 } });
    expect(cursor).toBe(8);
    expect(changes).toEqual([
      {
        change: {
          collection: 'notes',
          id: 'n1',
          iv: 'aXY=',
          ct: 'Y3Q=',
          updatedAt: 1000,
          deleted: false,
        },
        seq: 5,
      },
      {
        change: {
          collection: 'notes',
          id: 'n2',
          iv: 'aXY2',
          ct: 'Y3Q2',
          updatedAt: 1200,
          deleted: true,
        },
        seq: 8,
      },
    ]);
  });

  it('pull on an empty page holds the caller cursor (no rewind)', async () => {
    const { client } = fakeClient({ pull: { data: [], error: null } });
    const { changes, cursor } = await supabaseRemote(client).pull(11);
    expect(changes).toEqual([]);
    expect(cursor).toBe(11);
  });

  it('surfaces RPC errors instead of silently losing data', async () => {
    const pushErr = fakeClient({ push: { data: null, error: { message: 'rls denied' } } });
    await expect(supabaseRemote(pushErr.client).push([change()])).rejects.toThrow(
      /lar_push failed: rls denied/,
    );

    const pullErr = fakeClient({ pull: { data: null, error: { message: 'jwt expired' } } });
    await expect(supabaseRemote(pullErr.client).pull(0)).rejects.toThrow(
      /lar_pull failed: jwt expired/,
    );
  });
});
