import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

function run(method = 'GET') {
  return middleware(new NextRequest(new URL('http://localhost/'), { method }));
}

/** Pull the nonce out of a `… 'nonce-XXXX' …` CSP directive string. */
function nonceOf(csp: string | null): string | null {
  const m = csp?.match(/'nonce-([^']+)'/);
  return m ? m[1]! : null;
}

describe('security middleware (CSP nonce + headers)', () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('sets a Content-Security-Policy on the response, carrying a nonce', () => {
    const csp = run().headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(nonceOf(csp)).toBeTruthy();
  });

  it('REGRESSION GUARD: the request-side CSP carries the SAME nonce as the response CSP', () => {
    // Next.js derives the nonce for its OWN framework <script> tags from the
    // REQUEST `Content-Security-Policy` header. If the middleware sets the CSP
    // only on the response (as it did before fix c38cb71), Next mints a
    // different nonce than the one `layout.tsx` stamps on the inline themeCss
    // <style> + theme-boot <script> — the browser then blocks our inline tags
    // and the entire visual theme silently collapses. This test fails closed if
    // the request-side CSP is ever dropped again.
    const res = run();
    const responseCsp = res.headers.get('content-security-policy');

    // `NextResponse.next({ request: { headers } })` records the overridden
    // request headers via these internal markers; assert ours are present.
    const overrides = res.headers.get('x-middleware-override-headers') ?? '';
    expect(overrides).toContain('content-security-policy');
    expect(overrides).toContain('x-nonce');

    const requestCsp = res.headers.get('x-middleware-request-content-security-policy');
    const requestNonce = res.headers.get('x-middleware-request-x-nonce');

    expect(requestCsp).toBe(responseCsp); // identical header → identical nonce
    expect(requestNonce).toBeTruthy();
    expect(nonceOf(responseCsp)).toBe(requestNonce); // response nonce === x-nonce
  });

  it('ships the Nosecone-style hardening headers', () => {
    const h = run().headers;
    expect(h.get('strict-transport-security')).toContain('max-age=63072000');
    expect(h.get('x-frame-options')).toBe('DENY');
    expect(h.get('x-content-type-options')).toBe('nosniff');
    expect(h.get('referrer-policy')).toBe('no-referrer');
    expect(h.get('permissions-policy')).toContain('microphone=(self)');
    expect(h.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(h.get('cross-origin-resource-policy')).toBe('same-origin');
  });

  it('mints a fresh nonce per request (never reuses one)', () => {
    const a = nonceOf(run().headers.get('content-security-policy'));
    const b = nonceOf(run().headers.get('content-security-policy'));
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('surfaces X-Lar-Kill-Switch only when LAR_KILL_SWITCH=1', () => {
    expect(run().headers.get('x-lar-kill-switch')).toBeNull();
    process.env.LAR_KILL_SWITCH = '1';
    expect(run().headers.get('x-lar-kill-switch')).toBe('1');
  });
});
