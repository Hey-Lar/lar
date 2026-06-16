'use client';

/**
 * MFA (TOTP) helpers — thin wrappers over supabase.auth.mfa.* plus a PURE state
 * machine for the AAL step-up decision (the part with real logic + tests).
 *
 * Model: a user "enrolls" a TOTP factor once (enroll → verify a code → factor becomes
 * verified, session upgrades to aal2). On every NEW session they start at aal1 and must
 * pass a challenge to reach aal2 again. getAuthenticatorAssuranceLevel() returns
 * { currentLevel, nextLevel } which we map to a clear UI state via aalStepUpState().
 *
 * Real enforcement is in Postgres RLS (see supabase/migrations/0003_mfa_aal.sql) — this
 * client logic is UX only. Inert until Supabase is configured + the user enrolls.
 */

import { createClient } from './client';

/** UI-facing interpretation of Supabase's { currentLevel, nextLevel } AAL pair. */
export type AalState =
  | 'unauthenticated' // no session
  | 'no_mfa' // signed in, no verified factor — offer enrollment
  | 'needs_challenge' // has a factor but session is aal1 — show the 6-digit step-up
  | 'mfa_satisfied' // aal2 reached this session
  | 'downgraded'; // had aal2, factors removed — treat as aal1 going forward

/**
 * Pure mapping of Supabase AAL levels → a single UI state. Mirrors the documented
 * table: aal1/aal1 = no factor, aal1/aal2 = step-up pending, aal2/aal2 = done,
 * aal2/aal1 = factors were unenrolled. `null` current = no session.
 */
export function aalStepUpState(
  currentLevel: string | null | undefined,
  nextLevel: string | null | undefined,
): AalState {
  if (!currentLevel) return 'unauthenticated';
  if (currentLevel === 'aal1' && nextLevel === 'aal2') return 'needs_challenge';
  if (currentLevel === 'aal2' && nextLevel === 'aal2') return 'mfa_satisfied';
  if (currentLevel === 'aal2' && nextLevel === 'aal1') return 'downgraded';
  return 'no_mfa';
}

/** True when the user should be prompted to complete a 6-digit challenge right now. */
export function needsStepUp(state: AalState): boolean {
  return state === 'needs_challenge';
}

// --- thin client wrappers (browser only) ---------------------------------------

export async function enrollTotp(friendlyName = 'Authenticator app') {
  return createClient().auth.mfa.enroll({ factorType: 'totp', friendlyName });
}

/** Challenge + verify a freshly-typed 6-digit code in one call; upgrades to aal2. */
export async function verifyTotp(factorId: string, code: string) {
  return createClient().auth.mfa.challengeAndVerify({ factorId, code });
}

export async function listFactors() {
  return createClient().auth.mfa.listFactors();
}

export async function unenrollFactor(factorId: string) {
  return createClient().auth.mfa.unenroll({ factorId });
}

/** Current AAL as a UI state (see aalStepUpState). */
export async function assuranceState(): Promise<AalState> {
  const { data } = await createClient().auth.mfa.getAuthenticatorAssuranceLevel();
  return aalStepUpState(data?.currentLevel ?? null, data?.nextLevel ?? null);
}
