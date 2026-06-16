/**
 * safeNextPath — sanitize a post-sign-in `next` redirect to a SAME-ORIGIN path only.
 *
 * Open-redirect defense for /auth/confirm. We resolve `next` with the SAME WHATWG URL
 * parser that NextResponse.redirect uses, against a sentinel base, and reject anything
 * whose resolved origin changed — which catches every authority-smuggling trick a char
 * blacklist misses: '//evil.com', '/\\evil.com' (backslash → '/'), '/\t//evil.com'
 * (control chars stripped), and absolute/scheme URLs. Falls back to '/'.
 */
const SENTINEL = 'http://lar.invalid';

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || raw[0] !== '/') return '/';
  try {
    const url = new URL(raw, SENTINEL);
    if (url.origin !== SENTINEL) return '/'; // smuggled a cross-origin authority
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
