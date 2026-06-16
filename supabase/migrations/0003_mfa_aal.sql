-- ============================================================================
-- MFA step-up enforcement for the sync store  (migration 0003)
-- ============================================================================
-- Enforces TOTP MFA *at the data layer* — the only enforcement that can't be
-- bypassed from the browser. The JWT carries an `aal` claim ('aal1' | 'aal2').
--
-- OPTED-IN variant (chosen deliberately to avoid lockout): a user must be aal2
-- ONLY IF they have a verified factor. Users who never enrolled MFA keep working
-- at aal1 — so applying this is SAFE even before anyone enrolls (no-op until a
-- factor exists). A 'require aal2 for everyone' policy would instantly lock out
-- every un-enrolled user; we explicitly do NOT do that.
--
-- RESTRICTIVE policies AND with the existing permissive own-rows policies, so this
-- tightens access without replacing the per-user isolation from migration 0001.
-- Idempotent. Apply when arming MFA (see docs/20-auth.md). Auth is human-gated.
-- ============================================================================

drop policy if exists "lar_documents require aal2 when enrolled" on public.lar_documents;
create policy "lar_documents require aal2 when enrolled"
  on public.lar_documents
  as restrictive
  to authenticated
  using (
    -- pass if the session's aal is in the set required for THIS user:
    --   has >=1 verified factor  -> {aal2}        (must step up)
    --   has no verified factor   -> {aal1, aal2}  (aal1 is fine)
    array[(select auth.jwt() ->> 'aal')] <@ (
      select case
        when count(*) > 0 then array['aal2']
        else array['aal1', 'aal2']
      end
      from auth.mfa_factors f
      where f.user_id = (select auth.uid()) and f.status = 'verified'
    )
  );
