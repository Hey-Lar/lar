-- ============================================================================
-- Lar end-to-end-encrypted sync store  (migration 0001)
-- ============================================================================
-- The server holds CIPHERTEXT ONLY. Every row stores the AES-256-GCM `iv` + `ct`
-- produced on the user's device, plus the minimal last-write-wins metadata the
-- sync engine needs (collection, id, updated_at, deleted, seq). The server NEVER
-- sees plaintext, the passphrase, or the master key — those never leave the device.
--
-- This is the server counterpart to @lar/store's `SyncRemote` (pull/push, LWW by
-- updated_at, monotonic seq cursor). See docs/19-sync-architecture.md (protocol)
-- and docs/20-auth.md (how to apply this + arm auth).
--
-- DRAFT: not applied to any project yet. A human applies it via the Supabase SQL
-- editor or `supabase db push` when arming sync (auth is human-gated — agent drafts).
-- Idempotent (if-not-exists / create-or-replace) so re-running is safe.
-- ============================================================================

-- Monotonic ordering source for pull cursors. Bumped on EVERY write (see trigger)
-- so a changed row re-surfaces past any device's cursor. Global, but pulls filter
-- by user_id, so a cursor only ever advances over the caller's own writes.
create sequence if not exists public.lar_sync_seq;

create table if not exists public.lar_documents (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  collection text    not null,
  id         text    not null,
  iv         text    not null,                                  -- AES-GCM IV (base64) — opaque
  ct         text    not null,                                  -- ciphertext (base64) — opaque
  updated_at bigint  not null,                                  -- store's monotonic clock (LWW key)
  deleted    boolean not null default false,                    -- tombstone
  seq        bigint  not null default nextval('public.lar_sync_seq'),
  primary key (user_id, collection, id)
);

-- "Everything since my cursor", scoped per user.
create index if not exists lar_documents_user_seq on public.lar_documents (user_id, seq);

-- Bump seq on INSERT *and* UPDATE so an edited row is pulled again by other devices.
create or replace function public.lar_documents_bump_seq()
returns trigger
language plpgsql
as $$
begin
  new.seq := nextval('public.lar_sync_seq');
  return new;
end;
$$;

drop trigger if exists lar_documents_seq on public.lar_documents;
create trigger lar_documents_seq
  before insert or update on public.lar_documents
  for each row execute function public.lar_documents_bump_seq();

-- --------------------------------------------------------------------------
-- Row-level security: a user can only ever touch their OWN rows. The keyless
-- app uses none of this; once armed, RLS is the hard wall between users.
-- --------------------------------------------------------------------------
alter table public.lar_documents enable row level security;

drop policy if exists "lar_documents own select" on public.lar_documents;
create policy "lar_documents own select" on public.lar_documents
  for select using ((select auth.uid()) = user_id);

drop policy if exists "lar_documents own insert" on public.lar_documents;
create policy "lar_documents own insert" on public.lar_documents
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "lar_documents own update" on public.lar_documents;
create policy "lar_documents own update" on public.lar_documents
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "lar_documents own delete" on public.lar_documents;
create policy "lar_documents own delete" on public.lar_documents
  for delete using ((select auth.uid()) = user_id);

-- --------------------------------------------------------------------------
-- RPCs matching SyncRemote.push / .pull. SECURITY INVOKER → RLS still applies
-- (defense in depth: even a bug here can't cross the user boundary).
-- --------------------------------------------------------------------------

-- push: last-write-wins upsert of a ciphertext batch; returns the caller's max cursor.
-- LWW is enforced in the DB: the row is only overwritten by a STRICTLY newer updated_at.
create or replace function public.lar_push(changes jsonb)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c jsonb;
begin
  for c in select value from jsonb_array_elements(changes)
  loop
    insert into public.lar_documents (collection, id, iv, ct, updated_at, deleted)
    values (
      c->>'collection',
      c->>'id',
      c->>'iv',
      c->>'ct',
      (c->>'updatedAt')::bigint,
      coalesce((c->>'deleted')::boolean, false)
    )
    on conflict (user_id, collection, id) do update
      set iv = excluded.iv,
          ct = excluded.ct,
          updated_at = excluded.updated_at,
          deleted = excluded.deleted
      where excluded.updated_at > public.lar_documents.updated_at;
  end loop;

  return coalesce(
    (select max(seq) from public.lar_documents where user_id = (select auth.uid())),
    0
  );
end;
$$;

-- pull: every change strictly after `since`, oldest-first, for the caller only.
create or replace function public.lar_pull(since bigint)
returns table (
  collection text,
  id         text,
  iv         text,
  ct         text,
  updated_at bigint,
  deleted    boolean,
  seq        bigint
)
language sql
security invoker
set search_path = ''
as $$
  select collection, id, iv, ct, updated_at, deleted, seq
  from public.lar_documents
  where user_id = (select auth.uid()) and seq > since
  order by seq asc;
$$;

-- Only signed-in users sync. Postgres grants EXECUTE to PUBLIC by default, so we
-- must revoke from PUBLIC (not just `anon`) to actually close the door, then grant
-- back to `authenticated` only. (RLS already denies anon any rows — this is
-- defense-in-depth so the logged-out role can't even invoke the functions.)
revoke execute on function public.lar_push(jsonb) from public;
revoke execute on function public.lar_pull(bigint) from public;
grant execute on function public.lar_push(jsonb) to authenticated;
grant execute on function public.lar_pull(bigint) to authenticated;
