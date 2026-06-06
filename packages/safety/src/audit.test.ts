import { describe, it, expect } from 'vitest';
import { InMemoryAuditLog } from './audit.js';
import type { AuditEntry } from './audit.js';

describe('InMemoryAuditLog', () => {
  it('stores entries in order', () => {
    const log = new InMemoryAuditLog();
    log.record({ at: 1, name: 'a', allowed: true });
    log.record({ at: 2, name: 'b', allowed: false, reason: 'blocked' });
    expect(log.entries).toHaveLength(2);
    expect(log.entries[0]?.name).toBe('a');
    expect(log.entries[1]?.name).toBe('b');
  });

  it('stored entries have correct field values', () => {
    const log = new InMemoryAuditLog();
    log.record({ at: 42, name: 'op', allowed: false, reason: 'kill-switch active' });
    const e = log.entries[0]!;
    expect(e.at).toBe(42);
    expect(e.name).toBe('op');
    expect(e.allowed).toBe(false);
    expect(e.reason).toBe('kill-switch active');
  });

  it('stored entries contain ONLY AuditEntry fields — no secret-shaped extras', () => {
    const log = new InMemoryAuditLog();
    // Simulate a caller that accidentally passes extra fields beyond AuditEntry.
    // The safe copy in record() must drop them.
    const malicious = {
      at: 1,
      name: 'op',
      allowed: true,
      apiKey: 'super-secret-key',
      password: 'hunter2',
    } as unknown as AuditEntry;
    log.record(malicious);
    const e = log.entries[0]!;
    const keys = Object.keys(e);
    for (const k of keys) {
      expect(['at', 'name', 'allowed', 'reason']).toContain(k);
    }
    expect(e).not.toHaveProperty('apiKey');
    expect(e).not.toHaveProperty('password');
  });

  it('omits reason field when not present (no undefined pollution)', () => {
    const log = new InMemoryAuditLog();
    log.record({ at: 1, name: 'ok', allowed: true });
    expect(log.entries[0]).not.toHaveProperty('reason');
  });

  it('starts with an empty entries array', () => {
    const log = new InMemoryAuditLog();
    expect(log.entries).toEqual([]);
  });
});
