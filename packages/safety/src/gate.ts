// @lar/safety — transport-agnostic, fail-closed gate.
//
// Decision order (deny wins — fail-closed):
//   1. Kill-switch: killSwitchEnv is set AND its value is truthy → deny everything.
//   2. Read-only:   readOnly=true AND req.mutating=true → deny mutation.
//   3. Stale guard: maxStaleMs set AND (lastDataAt missing OR data is too old) → deny.
//   4. Otherwise → allow.
//
// The audit log records only structural fields (name/allowed/reason/at).
// It NEVER records request payload or secret values.

import type { AuditLog, AuditEntry } from './audit.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type { AuditLog, AuditEntry };

export interface GateConfig {
  /** When true (default), mutating requests are blocked. */
  readOnly?: boolean;
  /** Name of an env var; if its value is truthy the gate blocks everything. */
  killSwitchEnv?: string;
  /** Maximum age of lastDataAt (ms). Missing freshness info also fails closed. */
  maxStaleMs?: number;
  /** Clock source — override in tests to control time. */
  now?: () => number;
  /** Env reader — override in tests to avoid polluting process.env. */
  readEnv?: (name: string) => string | undefined;
  /** Receives one AuditEntry per check call. */
  audit?: AuditLog;
}

export interface GateRequest {
  /** Human-readable name of the operation being gated. */
  name: string;
  /** True if the operation would write/mutate state. */
  mutating?: boolean;
  /** Epoch ms of the most recent data snapshot used by this request. */
  lastDataAt?: number;
}

export interface GateDecision {
  allowed: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createGate(config?: GateConfig): { check(req: GateRequest): GateDecision } {
  const readOnly = config?.readOnly ?? true; // default-safe
  const killSwitchEnv = config?.killSwitchEnv;
  const maxStaleMs = config?.maxStaleMs;
  const now = config?.now ?? (() => Date.now());
  const readEnv = config?.readEnv ?? ((n: string) => process.env[n]);
  const auditLog = config?.audit;

  function decide(req: GateRequest): GateDecision {
    // 1. Kill-switch — blocks EVERYTHING, including reads.
    if (killSwitchEnv !== undefined) {
      const val = readEnv(killSwitchEnv) ?? '';
      const truthy = val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'on';
      if (truthy) {
        return { allowed: false, reason: 'kill-switch active' };
      }
    }

    // 2. Read-only guard — blocks mutations.
    if (readOnly && req.mutating === true) {
      return { allowed: false, reason: 'read-only mode: mutation blocked' };
    }

    // 3. Stale guard — fail-closed when freshness info is missing or stale.
    if (maxStaleMs !== undefined) {
      if (req.lastDataAt === undefined) {
        return { allowed: false, reason: 'stale data: no freshness info' };
      }
      if (now() - req.lastDataAt > maxStaleMs) {
        return { allowed: false, reason: 'stale data: fail-closed' };
      }
    }

    // 4. Allow.
    return { allowed: true };
  }

  return {
    check(req: GateRequest): GateDecision {
      const decision = decide(req);

      // Audit log — records only structural gate fields, NEVER request payload or secrets.
      if (auditLog) {
        const entry: AuditEntry = {
          at: now(),
          name: req.name,
          allowed: decision.allowed,
          ...(decision.reason !== undefined ? { reason: decision.reason } : {}),
        };
        auditLog.record(entry);
      }

      return decision;
    },
  };
}
