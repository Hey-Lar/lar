import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authorize } from './authz';

function mockReq(method: string): Request {
  return new Request('http://localhost/api/x', { method });
}

describe('authorize', () => {
  const ORIGINAL_ENV = { ...process.env };
  beforeEach(() => {
    delete process.env.LAR_KILL_SWITCH;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('default policy (personal) lets a GET through', () => {
    const g = authorize(mockReq('GET'));
    expect(g.ok).toBe(true);
  });

  it('default allow-list (GET only) rejects POST', () => {
    const g = authorize(mockReq('POST'));
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.status).toBe(405);
      expect(g.reason).toBe('method-not-allowed');
    }
  });

  it('allow-list can be widened per-route', () => {
    const g = authorize(mockReq('POST'), { allow: ['GET', 'POST'] });
    expect(g.ok).toBe(true);
  });

  it('LAR_KILL_SWITCH=1 returns a 503 regardless of method/policy', () => {
    process.env.LAR_KILL_SWITCH = '1';
    const g = authorize(mockReq('GET'));
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.status).toBe(503);
      expect(g.reason).toBe('kill-switch');
    }
  });

  it('session / token / origin policies are fail-closed until wired', () => {
    for (const policy of ['session', 'token', 'origin'] as const) {
      const g = authorize(mockReq('GET'), { policy });
      expect(g.ok, policy).toBe(false);
      if (!g.ok) {
        expect(g.status).toBe(401);
        expect(g.reason).toBe('unauthenticated');
      }
    }
  });

  it('AuthzDeny.response carries the JSON the handler should return', async () => {
    const g = authorize(mockReq('POST'));
    if (g.ok) throw new Error('expected deny');
    const body = (await g.response.json()) as { ok: boolean; reason: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('method-not-allowed');
  });
});
