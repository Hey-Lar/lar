import { describe, it, expect } from 'vitest';
import { createGate } from './gate.js';
import { InMemoryAuditLog } from './audit.js';

// ---------------------------------------------------------------------------
// 1. Read-only mode
// ---------------------------------------------------------------------------
describe('read-only mode', () => {
  it('blocks a mutating request when readOnly=true (default)', () => {
    const gate = createGate();
    const d = gate.check({ name: 'write-something', mutating: true });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('read-only mode: mutation blocked');
  });

  it('allows a non-mutating read when readOnly=true', () => {
    const gate = createGate();
    const d = gate.check({ name: 'read-something', mutating: false });
    expect(d.allowed).toBe(true);
  });

  it('allows a mutating request when readOnly=false', () => {
    const gate = createGate({ readOnly: false });
    const d = gate.check({ name: 'write-something', mutating: true });
    expect(d.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Kill-switch — hard-blocks everything, including reads
// ---------------------------------------------------------------------------
describe('kill-switch', () => {
  it('denies a read when kill-switch env is "1"', () => {
    const gate = createGate({
      killSwitchEnv: 'LAR_KILL',
      readEnv: (n) => (n === 'LAR_KILL' ? '1' : undefined),
    });
    const d = gate.check({ name: 'read-something', mutating: false });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('kill-switch active');
  });

  it('denies a mutation when kill-switch env is "true"', () => {
    const gate = createGate({
      killSwitchEnv: 'LAR_KILL',
      readOnly: false,
      readEnv: (n) => (n === 'LAR_KILL' ? 'true' : undefined),
    });
    const d = gate.check({ name: 'write-something', mutating: true });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('kill-switch active');
  });

  it('denies when kill-switch env is "on"', () => {
    const gate = createGate({
      killSwitchEnv: 'LAR_KILL',
      readEnv: (n) => (n === 'LAR_KILL' ? 'on' : undefined),
    });
    expect(gate.check({ name: 'x' }).allowed).toBe(false);
  });

  it('allows when kill-switch env is absent', () => {
    const gate = createGate({
      killSwitchEnv: 'LAR_KILL',
      readEnv: () => undefined,
    });
    const d = gate.check({ name: 'read-something' });
    expect(d.allowed).toBe(true);
  });

  it('allows when kill-switch env is empty string', () => {
    const gate = createGate({
      killSwitchEnv: 'LAR_KILL',
      readEnv: (n) => (n === 'LAR_KILL' ? '' : undefined),
    });
    expect(gate.check({ name: 'read-something' }).allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Stale guard
// ---------------------------------------------------------------------------
describe('stale guard', () => {
  const MAX_STALE_MS = 5_000;

  it('denies when lastDataAt is older than maxStaleMs', () => {
    const now = 1_000_000;
    const gate = createGate({
      maxStaleMs: MAX_STALE_MS,
      now: () => now,
    });
    const d = gate.check({ name: 'refresh-op', lastDataAt: now - MAX_STALE_MS - 1 });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('stale data: fail-closed');
  });

  it('allows when lastDataAt is fresh (within maxStaleMs)', () => {
    const now = 1_000_000;
    const gate = createGate({
      maxStaleMs: MAX_STALE_MS,
      now: () => now,
    });
    const d = gate.check({ name: 'refresh-op', lastDataAt: now - MAX_STALE_MS + 1 });
    expect(d.allowed).toBe(true);
  });

  it('allows when lastDataAt equals now (exactly fresh)', () => {
    const now = 1_000_000;
    const gate = createGate({ maxStaleMs: MAX_STALE_MS, now: () => now });
    expect(gate.check({ name: 'op', lastDataAt: now }).allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3b. Read-only mode — truthy non-boolean mutating values (fail-closed)
// ---------------------------------------------------------------------------
describe('read-only mode: truthy non-boolean mutating', () => {
  it('blocks when mutating is 1 (truthy non-boolean)', () => {
    const gate = createGate();
    const d = gate.check({ name: 'x', mutating: 1 as unknown as boolean });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('read-only mode: mutation blocked');
  });

  it('allows when mutating is 0 (falsy non-boolean)', () => {
    const gate = createGate();
    const d = gate.check({ name: 'x', mutating: 0 as unknown as boolean });
    expect(d.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Stale guard — missing lastDataAt fails closed
// ---------------------------------------------------------------------------
describe('stale guard: missing freshness info', () => {
  it('denies when maxStaleMs is set but lastDataAt is missing', () => {
    const gate = createGate({ maxStaleMs: 1_000 });
    const d = gate.check({ name: 'op' }); // no lastDataAt
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('stale data: no freshness info');
  });

  it('denies when maxStaleMs is set and lastDataAt is null (explicit null)', () => {
    const gate = createGate({ maxStaleMs: 1_000 });
    const d = gate.check({ name: 'op', lastDataAt: null as unknown as number });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('stale data: no freshness info');
  });
});

// ---------------------------------------------------------------------------
// 4b. Fail-closed under error — readEnv throwing propagates (never returns allowed)
// ---------------------------------------------------------------------------
describe('fail-closed under error', () => {
  it('throws when readEnv throws (does not silently return allowed)', () => {
    const gate = createGate({
      killSwitchEnv: 'SOME_ENV',
      readEnv: () => {
        throw new Error('env read failure');
      },
    });
    expect(() => gate.check({ name: 'op' })).toThrow('env read failure');
  });
});

// ---------------------------------------------------------------------------
// 5. Audit log — receives an entry per check; NO payload/secrets
// ---------------------------------------------------------------------------
describe('audit log', () => {
  it('records an entry per check call', () => {
    const log = new InMemoryAuditLog();
    const gate = createGate({ audit: log, readOnly: false });
    gate.check({ name: 'op-a' });
    gate.check({ name: 'op-b', mutating: true });
    expect(log.entries).toHaveLength(2);
    expect(log.entries[0]?.name).toBe('op-a');
    expect(log.entries[1]?.name).toBe('op-b');
  });

  it('records correct allowed/reason on a blocked call', () => {
    const log = new InMemoryAuditLog();
    const gate = createGate({ audit: log }); // readOnly=true by default
    gate.check({ name: 'write-op', mutating: true });
    const entry = log.entries[0]!;
    expect(entry.allowed).toBe(false);
    expect(entry.reason).toBe('read-only mode: mutation blocked');
  });

  it('records correct allowed=true and no reason on an allowed call', () => {
    const log = new InMemoryAuditLog();
    const gate = createGate({ audit: log });
    gate.check({ name: 'read-op' });
    const entry = log.entries[0]!;
    expect(entry.allowed).toBe(true);
    expect(entry.reason).toBeUndefined();
  });

  it('audit entry has ONLY the expected fields — no payload or secret data', () => {
    const log = new InMemoryAuditLog();
    const gate = createGate({ audit: log });
    gate.check({ name: 'secret-op', mutating: false, lastDataAt: 12345 });
    const entry = log.entries[0]!;
    const keys = Object.keys(entry);
    // Allowed fields: at, name, allowed, reason.
    for (const k of keys) {
      expect(['at', 'name', 'allowed', 'reason']).toContain(k);
    }
    // No payload field (lastDataAt, mutating, etc.) must leak into the log.
    expect(entry).not.toHaveProperty('lastDataAt');
    expect(entry).not.toHaveProperty('mutating');
  });

  it('records timestamp (at) as a number', () => {
    const log = new InMemoryAuditLog();
    const FIXED_NOW = 9_999_999;
    const gate = createGate({ audit: log, now: () => FIXED_NOW });
    gate.check({ name: 'timed-op' });
    expect(log.entries[0]?.at).toBe(FIXED_NOW);
  });
});

// ---------------------------------------------------------------------------
// 6. Non-mutating read with no staleness config → allowed
// ---------------------------------------------------------------------------
describe('happy path', () => {
  it('allows a plain read with default config (no staleness, no kill-switch)', () => {
    const gate = createGate(); // readOnly=true, no maxStaleMs, no killSwitchEnv
    const d = gate.check({ name: 'fetch-data' });
    expect(d.allowed).toBe(true);
    expect(d.reason).toBeUndefined();
  });

  it('allows with all options set but none blocking', () => {
    const now = 1_000_000;
    const gate = createGate({
      readOnly: true,
      killSwitchEnv: 'KILL',
      maxStaleMs: 60_000,
      now: () => now,
      readEnv: () => undefined,
    });
    const d = gate.check({ name: 'fetch-data', mutating: false, lastDataAt: now - 1_000 });
    expect(d.allowed).toBe(true);
  });
});
