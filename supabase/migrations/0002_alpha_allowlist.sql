-- ============================================================================
-- Alpha access gate — Before-User-Created hook  (migration 0002)
-- ============================================================================
-- Keeps the alpha INVITE-ONLY: only emails on `alpha_allowlist` can create an
-- account. This is the ONE server-side chokepoint that gates EVERY sign-in method
-- (Google, Apple, email magic-link) at account-creation time — it runs inside
-- Supabase Auth and can't be bypassed from the browser, unlike a client-side check.
--
-- TWO STEPS to arm (see docs/20-auth.md):
--   1. Apply this migration (creates the table + function + grants).
--   2. Dashboard > Authentication > Hooks > "Before User Created" > Postgres >
--      pick public.before_user_created > Enable.
-- ⚠️  SEED YOUR OWN EMAIL FIRST (done below for alberto@heylar.ai) or you lock
--     yourself out. Add testers with:  insert into public.alpha_allowlist values ('x@y.com');
--
-- NOTE: phone/SMS sign-ups carry NO email, so an email allow-list BLOCKS them. That's
-- fine while phone isn't an alpha method; branch on phone here if you enable it.
-- Idempotent. Auth is human-gated — agent drafts, a human applies + enables.
-- ============================================================================

create table if not exists public.alpha_allowlist (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.alpha_allowlist enable row level security;

-- The hook: receives the new-user event, returns {} to ALLOW or an error to BLOCK.
-- The user row does NOT exist yet, so read the email from the event payload (not auth.users).
create or replace function public.before_user_created(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_email text := lower(event -> 'user' ->> 'email');
begin
  if v_email is not null
     and exists (select 1 from public.alpha_allowlist a where lower(a.email) = v_email) then
    return '{}'::jsonb; -- ALLOW
  end if;

  return jsonb_build_object( -- BLOCK (message is shown to the user)
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'Lar is in private alpha. Ask Alberto to add your email to the list.'
    )
  );
end;
$$;

-- Exact grants the docs require: only the auth admin may execute / read the list.
-- (No SECURITY DEFINER — explicit grants instead.)
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.before_user_created(jsonb) from anon, authenticated, public;

grant select on table public.alpha_allowlist to supabase_auth_admin;
revoke all on table public.alpha_allowlist from anon, authenticated, public;

-- RLS is on, so the auth admin needs an explicit SELECT policy or it reads ZERO rows
-- (which would block everyone). This single policy is what makes the gate work.
drop policy if exists "auth admin reads allowlist" on public.alpha_allowlist;
create policy "auth admin reads allowlist"
  on public.alpha_allowlist for select
  to supabase_auth_admin using (true);

-- Seed the founder so enabling the hook never locks you out. Add testers as above.
insert into public.alpha_allowlist (email, note)
values ('alberto@heylar.ai', 'founder')
on conflict (email) do nothing;
