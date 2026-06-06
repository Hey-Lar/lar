/**
 * Per-handler authorization seam.
 *
 * Why this exists: Next.js compiles Server Actions, Route Handlers, and DAL
 * functions into PUBLIC endpoints. Middleware alone is not a sufficient
 * authz gate — the March-2025 `x-middleware-subrequest` CVE (CVSS 9.1)
 * showed that authz checks living only in middleware can be bypassed by a
 * crafted header. The defense is to put the check at the TOP of every
 * handler. This module is that check.
 *
 * Today Lar is a personal, single-user, read-only surface deployed locally
 * (or to one Vercel project). The default `policy: 'personal'` accepts any
 * request the runtime delivers — there is no multi-tenant story to enforce
 * yet. The point is the SEAM: when SSO / Supabase / Auth.js lands, every
 * handler already calls `authorize()`; we swap the policy in one place.
 *
 * Bright-lines that DO ride along even at policy = 'personal':
 *  - method allow-list (defaults to `['GET']`; the bright-line in code,
 *    not in prose)
 *  - kill-switch via `LAR_KILL_SWITCH=1` env var — every handler 503s
 *    immediately. Lets you take the whole surface offline without a
 *    redeploy.
 *
 * Future hooks (when keys arrive):
 *  - `policy: 'session'` — validate a signed Supabase session cookie
 *  - `policy: 'token'`   — bearer token check (server-to-server)
 *  - `policy: 'origin'`  — same-origin only for non-GET state changes
 */

import { NextResponse, type NextRequest } from 'next/server';

export type AuthzPolicy = 'personal' | 'session' | 'token' | 'origin';

export interface AuthzOptions {
  /** Which authorization policy applies. Defaults to 'personal'. */
  policy?: AuthzPolicy;
  /** HTTP methods allowed for this handler. Defaults to `['GET']`. */
  allow?: ReadonlyArray<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'>;
}

export interface AuthzPass {
  ok: true;
}

export interface AuthzDeny {
  ok: false;
  status: number;
  reason: 'kill-switch' | 'method-not-allowed' | 'unauthenticated' | 'forbidden';
  response: NextResponse;
}

export type AuthzResult = AuthzPass | AuthzDeny;

/**
 * Run the check. Returns `{ ok: true }` when the handler may proceed, or
 * an `AuthzDeny` carrying a ready-to-return NextResponse otherwise — the
 * caller does `if (!gate.ok) return gate.response;` at the top of the
 * handler. The contract is intentionally narrow: no side effects, no
 * console output, no thrown errors. Decisions only.
 */
export function authorize(req: Request | NextRequest, opts: AuthzOptions = {}): AuthzResult {
  const policy: AuthzPolicy = opts.policy ?? 'personal';
  const allow = opts.allow ?? (['GET'] as const);

  if (process.env.LAR_KILL_SWITCH === '1') {
    return deny(503, 'kill-switch', 'service-disabled');
  }

  if (!allow.includes(req.method as (typeof allow)[number])) {
    return deny(405, 'method-not-allowed', `method ${req.method} not allowed`);
  }

  switch (policy) {
    case 'personal':
      // Personal-use mode: accept any request the runtime delivers. The
      // method allow-list above is the only filter.
      return { ok: true };

    case 'session':
    case 'token':
    case 'origin':
      // Hooks for the real-auth future. Until those keys land, every
      // non-personal policy is fail-closed. This is deliberate: a typo
      // ({policy: 'sesion'}) becomes a 401 instead of a silent open door.
      return deny(401, 'unauthenticated', `policy "${policy}" requires auth wiring`);

    default:
      // Exhaustiveness guard (TS will catch an enum drift; this is the
      // runtime backstop).
      return deny(403, 'forbidden', 'unknown policy');
  }
}

function deny(status: number, reason: AuthzDeny['reason'], message: string): AuthzDeny {
  return {
    ok: false,
    status,
    reason,
    response: NextResponse.json({ ok: false, reason, error: message }, { status }),
  };
}
