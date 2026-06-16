/**
 * Which sign-in methods to SHOW — a capability flag, so a method the user can't yet
 * complete never appears as a button that throws (the researched best-practice: drive the
 * UI from known capability, not try/catch). Alberto turns each on as he provisions it.
 *
 * Set NEXT_PUBLIC_AUTH_METHODS to a comma list, e.g. "google,apple,phone,email,passkey".
 * Default (when unset) = the free, ready-now set: google, email, passkey.
 */

export type AuthMethod = 'google' | 'apple' | 'phone' | 'email' | 'passkey';

const ALL: readonly AuthMethod[] = ['google', 'apple', 'phone', 'email', 'passkey'];
const DEFAULT_METHODS = 'google,email,passkey';

export function enabledMethods(): Set<AuthMethod> {
  const raw = process.env.NEXT_PUBLIC_AUTH_METHODS ?? DEFAULT_METHODS;
  const parsed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AuthMethod => (ALL as readonly string[]).includes(s));
  return new Set(parsed.length ? parsed : ALL.filter((m) => DEFAULT_METHODS.includes(m)));
}

export function isMethodEnabled(method: AuthMethod): boolean {
  return enabledMethods().has(method);
}
