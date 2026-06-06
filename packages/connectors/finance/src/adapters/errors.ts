// Shared adapter error types.
// Every adapter wraps third-party failures in these so upstream callers
// (UI / audit log) get consistent error shapes.
//
// Ported from the founder's invest-bot-personal design/code/adapters/errors.ts.
// Pure — no I/O, no external dependencies.

export class BrokerError extends Error {
  readonly code: string;
  readonly broker: string;
  override readonly cause?: unknown;
  constructor(broker: string, code: string, message: string, cause?: unknown) {
    super(`[${broker}:${code}] ${message}`);
    this.name = 'BrokerError';
    this.broker = broker;
    this.code = code;
    this.cause = cause;
  }
}

export class DataError extends Error {
  readonly code: string;
  readonly provider: string;
  override readonly cause?: unknown;
  constructor(provider: string, code: string, message: string, cause?: unknown) {
    super(`[${provider}:${code}] ${message}`);
    this.name = 'DataError';
    this.provider = provider;
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Coerce-with-fallback for SDK fields that may be string|number|null|undefined.
 * Returns the numeric value if finite, or `fallback` (default 0) otherwise.
 */
export function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
