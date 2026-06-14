/**
 * @lar/store — sync: reconcile a local-first encrypted store across devices.
 *
 * Privacy model: the SyncRemote only ever sees a `Change` = ciphertext (`iv`/`ct`)
 * + minimal last-write-wins metadata (`updatedAt`, `deleted`, `collection`, `id`).
 * It NEVER sees plaintext, the passphrase, or the master key — the master key lives
 * only on the user's devices. So a fully-untrusted backend (e.g. a Postgres table of
 * ciphertext rows) is enough; it stores blobs it cannot read.
 *
 * Reconciliation: last-write-wins by `updatedAt` (the store's clock is monotonic, so
 * local writes never tie; cross-device ties are resolved deterministically by the
 * remote keeping the existing row). Deletes are tombstones, so they propagate like any
 * other change. Two devices syncing against the same remote converge.
 *
 * See docs/19-sync-architecture.md for the full design + the deferred decisions
 * (real backend, key-transfer between devices, conflict policy beyond LWW).
 */
import type { Awaitable } from './adapter.js';
import type { Envelope, SyncableStore } from './store.js';

/** What crosses the wire. Ciphertext + LWW metadata only — never plaintext. */
export interface Change {
  collection: string;
  id: string;
  iv: string;
  ct: string;
  updatedAt: number;
  deleted: boolean;
}

/** A change tagged with the remote's monotonic ordering sequence. */
export interface RemoteChange {
  change: Change;
  seq: number;
}

/**
 * The network boundary. An implementation stores ciphertext blobs keyed by
 * (collection, id), keeps the latest per key (last-write-wins by updatedAt), and
 * assigns a monotonic `seq` so devices can pull "everything since my cursor".
 */
export interface SyncRemote {
  pull(sinceSeq: number): Awaitable<{ changes: RemoteChange[]; cursor: number }>;
  push(changes: Change[]): Awaitable<{ cursor: number }>;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  applied: number;
}

interface SyncState {
  remoteCursor: number;
  /** key → updatedAt last reconciled (so we don't push a just-pulled change back). */
  reconciled: Record<string, number>;
}

function keyOf(collection: string, id: string): string {
  return `${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
}

/**
 * In-memory SyncRemote — for tests, SSR, and as the reference implementation a real
 * backend (e.g. Supabase) must behave like. Stores only ciphertext + metadata.
 */
export function memoryRemote(): SyncRemote & { dump(): Change[]; size(): number } {
  const byKey = new Map<string, RemoteChange>();
  let seq = 0;
  return {
    push(changes) {
      for (const c of changes) {
        const key = keyOf(c.collection, c.id);
        const existing = byKey.get(key);
        // LWW: accept only a strictly-newer write (tie → keep existing = deterministic).
        if (!existing || c.updatedAt > existing.change.updatedAt) {
          seq += 1;
          byKey.set(key, { change: c, seq });
        }
      }
      return { cursor: seq };
    },
    pull(sinceSeq) {
      const changes = [...byKey.values()]
        .filter((rc) => rc.seq > sinceSeq)
        .sort((a, b) => a.seq - b.seq);
      return { changes, cursor: seq };
    },
    dump() {
      return [...byKey.values()].map((rc) => rc.change);
    },
    size() {
      return byKey.size;
    },
  };
}

export interface SyncEngine {
  /** Push local changes, pull remote changes, reconcile last-write-wins. Idempotent. */
  sync(): Promise<SyncResult>;
}

/**
 * Create a sync engine binding a local store to a remote. State (cursor + what's been
 * reconciled) is persisted in the store under the given `remoteId`, so sync is
 * resumable and incremental across sessions.
 */
export function createSyncEngine(
  store: SyncableStore,
  remote: SyncRemote,
  remoteId = 'default',
): SyncEngine {
  async function loadState(): Promise<SyncState> {
    const raw = await store.readSyncState(remoteId);
    if (!raw) return { remoteCursor: 0, reconciled: {} };
    try {
      const s = JSON.parse(raw) as Partial<SyncState>;
      return { remoteCursor: s.remoteCursor ?? 0, reconciled: s.reconciled ?? {} };
    } catch {
      return { remoteCursor: 0, reconciled: {} };
    }
  }

  return {
    async sync(): Promise<SyncResult> {
      const state = await loadState();

      // 1) PUSH — local records whose updatedAt is newer than we last reconciled.
      const envelopes = await store.scanEnvelopes();
      const toPush: Change[] = [];
      for (const { collection, id, env } of envelopes) {
        const k = keyOf(collection, id);
        if ((state.reconciled[k] ?? -1) < env.u) {
          toPush.push({
            collection,
            id,
            iv: env.iv,
            ct: env.ct,
            updatedAt: env.u,
            deleted: !!env.d,
          });
        }
      }
      if (toPush.length > 0) {
        await remote.push(toPush);
        for (const c of toPush) state.reconciled[keyOf(c.collection, c.id)] = c.updatedAt;
      }

      // 2) PULL — remote changes since our cursor; apply last-write-wins locally.
      const { changes, cursor } = await remote.pull(state.remoteCursor);
      let applied = 0;
      for (const { change } of changes) {
        const local = await store.readEnvelope(change.collection, change.id);
        if (!local || change.updatedAt > local.u) {
          const env: Envelope = {
            iv: change.iv,
            ct: change.ct,
            u: change.updatedAt,
            d: change.deleted,
          };
          await store.writeEnvelope(change.collection, change.id, env);
          applied += 1;
        }
        const k = keyOf(change.collection, change.id);
        state.reconciled[k] = Math.max(state.reconciled[k] ?? -1, change.updatedAt);
      }
      state.remoteCursor = cursor;

      await store.writeSyncState(remoteId, JSON.stringify(state));
      return { pushed: toPush.length, pulled: changes.length, applied };
    },
  };
}
