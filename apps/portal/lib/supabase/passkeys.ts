'use client';

/**
 * Passkey (WebAuthn) helpers — thin wrappers over the experimental supabase.auth
 * passkey API (enabled via the auth.experimental.passkey flag in client.ts).
 *
 * Model: a signed-in user REGISTERS a passkey (an upgrade on top of an existing
 * login), then on later visits SIGNS IN with it — the full WebAuthn ceremony is
 * handled by the SDK client-side (no /auth/confirm round-trip). EXPERIMENTAL: the
 * Supabase API may change; pinned to supabase-js ^2.108. Inert until Passkeys are
 * enabled in the Supabase dashboard.
 */

import { createClient } from './client';

/** WebAuthn available in this browser? (No point showing passkey UI otherwise.) */
export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window;
}

/** Sign in with a discoverable passkey (no email needed). Full ceremony in the SDK. */
export async function signInWithPasskey() {
  return createClient().auth.signInWithPasskey();
}

/** Register a passkey for the CURRENT signed-in user (requires an active session). */
export async function registerPasskey() {
  return createClient().auth.registerPasskey();
}

export async function listPasskeys() {
  return createClient().auth.passkey.list();
}

export async function renamePasskey(passkeyId: string, friendlyName: string) {
  return createClient().auth.passkey.update({ passkeyId, friendlyName });
}

export async function deletePasskey(passkeyId: string) {
  return createClient().auth.passkey.delete({ passkeyId });
}
