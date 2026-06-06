// @lar/safety — audit log implementations.
//
// KEYLESS: these implementations record ONLY the AuditEntry fields
// (at, name, allowed, reason). They never record request payload or secrets.

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  /** Epoch ms when the gate decision was made. */
  at: number;
  /** Name of the gated operation. */
  name: string;
  /** Whether the gate allowed the operation. */
  allowed: boolean;
  /** Human-readable reason for the decision, present when denied. */
  reason?: string;
}

export interface AuditLog {
  record(entry: AuditEntry): void;
}

// ---------------------------------------------------------------------------
// InMemoryAuditLog — stores entries for test inspection.
// ---------------------------------------------------------------------------

export class InMemoryAuditLog implements AuditLog {
  readonly entries: AuditEntry[] = [];

  record(entry: AuditEntry): void {
    // Defensive copy — only the four AuditEntry fields, nothing else.
    const safe: AuditEntry = {
      at: entry.at,
      name: entry.name,
      allowed: entry.allowed,
      ...(entry.reason !== undefined ? { reason: entry.reason } : {}),
    };
    this.entries.push(safe);
  }
}

// ---------------------------------------------------------------------------
// ConsoleAuditLog — writes to stderr; useful in production integrations.
// KEYLESS: only the AuditEntry fields are serialised — never secrets.
// ---------------------------------------------------------------------------

export class ConsoleAuditLog implements AuditLog {
  record(entry: AuditEntry): void {
    const line = JSON.stringify({
      at: entry.at,
      name: entry.name,
      allowed: entry.allowed,
      ...(entry.reason !== undefined ? { reason: entry.reason } : {}),
    });
    process.stderr.write(`[lar/safety] ${line}\n`);
  }
}
