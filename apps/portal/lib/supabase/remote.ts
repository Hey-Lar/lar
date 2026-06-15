/**
 * supabaseRemote — the client adapter that makes @lar/store's `SyncRemote` talk to
 * Supabase over the `lar_push` / `lar_pull` RPCs (see supabase/migrations/0001_lar_sync.sql).
 *
 * This is the cloud counterpart to `memoryRemote()`. It moves ONLY ciphertext: the
 * `Change` it sends already contains `iv`/`ct` sealed on-device — the passphrase and
 * master key never come near it. RLS + the RPCs scope everything to the signed-in user.
 *
 * DRAFT / inert: nothing calls this until sync is wired (post-arming). It's fully unit
 * tested against a fake client, so the protocol mapping is proven before it ever runs live.
 */
import type { Change, RemoteChange, SyncRemote } from '@lar/store';
import { createClient } from './client';

/** The slice of the Supabase client we use — kept tiny so tests can fake it. */
export interface RpcClient {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

/** A row as returned by the `lar_pull` RPC (snake_case, bigints arrive as number|string). */
interface PullRow {
  collection: string;
  id: string;
  iv: string;
  ct: string;
  updated_at: number | string;
  deleted: boolean;
  seq: number | string;
}

export function supabaseRemote(client?: RpcClient): SyncRemote {
  // Lazily construct the browser client so importing this module never throws on a
  // draft build; an injected client (tests) wins.
  const sb: RpcClient = client ?? (createClient() as unknown as RpcClient);

  return {
    async push(changes: Change[]): Promise<{ cursor: number }> {
      if (changes.length === 0) {
        // Nothing to push — still ask for the current cursor so callers can advance.
        const { data, error } = await sb.rpc('lar_push', { changes: [] });
        if (error) throw new Error(`lar_push failed: ${error.message}`);
        return { cursor: toInt(data) };
      }
      const { data, error } = await sb.rpc('lar_push', { changes });
      if (error) throw new Error(`lar_push failed: ${error.message}`);
      return { cursor: toInt(data) };
    },

    async pull(sinceSeq: number): Promise<{ changes: RemoteChange[]; cursor: number }> {
      const { data, error } = await sb.rpc('lar_pull', { since: sinceSeq });
      if (error) throw new Error(`lar_pull failed: ${error.message}`);
      const rows = (Array.isArray(data) ? data : []) as PullRow[];
      const changes: RemoteChange[] = rows.map((r) => ({
        change: {
          collection: r.collection,
          id: r.id,
          iv: r.iv,
          ct: r.ct,
          updatedAt: toInt(r.updated_at),
          deleted: Boolean(r.deleted),
        },
        seq: toInt(r.seq),
      }));
      // Cursor = the highest seq seen; if the page was empty, hold the caller's cursor.
      const cursor = changes.reduce((max, c) => (c.seq > max ? c.seq : max), sinceSeq);
      return { changes, cursor };
    },
  };
}

/** Postgres bigints can arrive as a JS number or a string — normalize to a safe int. */
function toInt(v: unknown): number {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
}
