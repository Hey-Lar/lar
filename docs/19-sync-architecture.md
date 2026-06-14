# 19 — Sync architecture (local-first, end-to-end encrypted)

> How HeyLar's data follows you across devices **without the server ever seeing it.**
> The foundation is built + tested (`@lar/store` `sync.ts`, 9 specs). The **one-way-door
> decisions** at the end need Alberto's sign-off before they're locked.

## The promise

Your data lives **encrypted on your devices**. To sync phone ↔ laptop, encrypted
blobs flow through a backend that **physically cannot read them** — it stores
ciphertext it has no key for. Lose every server and your data is still private; lose a
device and the others still have it. This is the technical spine of "we never
monetize your data — by architecture."

## The pieces (built)

```
 Device A  ──┐                                  ┌──  Device B
 EncryptedStore (master key in memory)          EncryptedStore (same master key)
   │  put/get/delete (seal/open locally)           │
   ▼                                                ▼
 SyncEngine ──push Change[] (ciphertext)──▶  SyncRemote  ◀──pull since cursor── SyncEngine
                                          (stores blobs it
                                           cannot decrypt)
```

- **Envelope** (per record, on disk): `{ iv, ct, u, d }` — sealed value (`iv`/`ct`) +
  `u` = updatedAt (ms) + `d` = deleted tombstone. Only `iv`/`ct` are secret.
- **Change** (on the wire): `{ collection, id, iv, ct, updatedAt, deleted }` — ciphertext
  - last-write-wins metadata. **No plaintext, ever.** (A test asserts the remote dump
    never contains the plaintext.)
- **SyncRemote**: `push(changes)` + `pull(sinceSeq)`. Keeps the latest blob per
  `(collection,id)` by LWW, assigns a monotonic `seq` so a device pulls "everything
  since my cursor." `memoryRemote()` is the reference impl + test double.
- **SyncEngine**: push local changes newer than last reconciled → pull remote changes →
  apply LWW locally → advance cursor. Resumable (state persisted per remote),
  idempotent, offline-friendly (a burst batches into one sync).

## Guarantees (proven by tests)

- ✅ A→B propagation; a 2nd device **decrypts** what the 1st wrote.
- ✅ **Convergence** of bidirectional edits (both devices end identical).
- ✅ **Last-write-wins** on a concurrent edit (latest `updatedAt` survives).
- ✅ **Deletes propagate** (tombstones); re-create after delete works.
- ✅ **Ciphertext-only** on the remote.
- ✅ Offline burst → one sync; idempotent re-sync; a late-joiner catches up full history.

## Privacy trade-offs (honest)

- **Metadata leakage (accepted):** the remote sees `collection`, `id`, `updatedAt`,
  `deleted`, and blob sizes — i.e. _"record X in collection Y changed at time T"_ — but
  never the content. This is the standard local-first-E2EE trade (Signal et al. leak
  similar). If we later want to hide even that, we can opaque-ify ids/collections
  (hash) and pad sizes — a future hardening, noted not done.
- **LWW loses the loser of a true concurrent edit.** Fine for notes/preferences; for
  anything where both edits must survive we'd use a CRDT or per-field merge (deferred).
- **Clock:** the store clock is monotonic per device (no local ties). Cross-device
  same-ms ties resolve deterministically (remote keeps existing). A **hybrid logical
  clock** is the correctness upgrade under real skew — deferred.

## ✅ One-way-door decisions — DECIDED 2026-06-14

1. **Backend → Supabase ciphertext store.** A Postgres table of ciphertext rows with
   per-user row-level security (EU project we already have); it only ever holds blobs
   it cannot read. _(Comes after auth/identity.)_
2. **Device key-transfer → BOTH (pairing code + recovery-phrase backup)** — the robust
   Ente/1Password model. **Pairing code** (existing device shows a one-time code/QR →
   entered on the new device) hands the key over device-to-device for normal
   multi-device use; a **recovery phrase** is the "lost all devices" backup. The server
   never sees the key in either path. **Security-critical + brand-fatal-if-wrong** — so
   it's built human-gated and is worth an external review before real users.
3. **Conflict policy → last-write-wins for v1.** CRDT/per-field merge only later, where
   both edits must survive.

## What's next (gated on auth/identity, which is itself human-gated)

1. **Auth/identity** (Supabase Auth) — needed before per-user RLS rows exist.
2. **Wire `SyncRemote` → Supabase** (ciphertext rows + RLS).
3. **Device-pairing flow** (code/QR) + **recovery-phrase** generation/restore — the
   key-transfer crypto. Until all three land, the engine runs fully against the
   in-memory remote — real, tested, backend-ready.
