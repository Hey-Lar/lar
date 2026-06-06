// RecordingAdapter — in-memory fixture replay for BrokerAdapter / DataAdapter.
//
// This is a READ-ONLY implementation of the B2 read-only contracts defined in
// ../contracts.ts. It replays pre-recorded responses from an in-memory fixture
// map so tests can run offline without hitting real brokers or data providers.
//
// DESIGN CONSTRAINTS (intentional):
//   - No filesystem I/O — fixtures are plain objects passed to the constructor.
//     This keeps the adapter KEYLESS and I/O-free; no real credentials or data
//     can leak from in-memory fixtures.
//   - NO write methods — placeOrder / cancelOrder / replaceOrder / streamOrders /
//     closePosition are intentionally absent. Lar never executes trades.
//   - Missing fixture → throws a clear BrokerError / DataError so tests fail
//     loudly rather than returning undefined silently.
//
// Fixture map schema:
//   The constructor accepts a plain object whose keys are `"method:argsJson"`.
//   Helper `fixtureKey(method, ...args)` builds these keys for you.
//   If the stored value is an Error instance, it is thrown (error replay).
//
// Example:
//   import { RecordingAdapter, fixtureKey } from './adapters';
//   const fixtures: FixtureMap = {
//     [fixtureKey('getQuote', 'AAPL')]: { symbol: 'AAPL', bid: 182, ... },
//     [fixtureKey('getAccount')]: { accountId: 'acct-1', equity: 50000, ... },
//   };
//   const adapter = new RecordingAdapter(fixtures, { name: 'test', mode: 'paper' });

import type {
  BrokerAdapter,
  DataAdapter,
  Account,
  Position,
  Quote,
  Bar,
  SymbolInfo,
  OrderRecord,
  ConnectionStatus,
  Resolution,
} from '../contracts';
import { BrokerError, DataError } from './errors';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Builds a stable fixture map key for the given method + arguments.
 * Key order in object arguments is normalised (sorted) to avoid mismatches.
 */
export function fixtureKey(method: string, ...args: unknown[]): string {
  return `${method}:${stableJson(args)}`;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableJson).join(',') + ']';
  }
  const sorted = Object.keys(value as object)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`)
    .join(',');
  return '{' + sorted + '}';
}

/**
 * A fixture map: keys built via `fixtureKey()`, values are the return value
 * (or an Error instance to simulate a thrown error).
 */
export type FixtureMap = Record<string, unknown>;

function lookup<T>(fixtures: FixtureMap, adapter: string, key: string): T {
  if (!(key in fixtures)) {
    const method = key.split(':')[0];
    throw new BrokerError(
      adapter,
      'not-found',
      `[RecordingAdapter] No fixture for key "${key}".\n` +
        `Method: ${method}\n` +
        `Fix: add fixtures["${key}"] = <expected value> in your test setup.`,
    );
  }
  const val = fixtures[key];
  if (val instanceof Error) throw val;
  return val as T;
}

// ---------------------------------------------------------------------------
// RecordingAdapter
//
// Implements BOTH BrokerAdapter and DataAdapter from ../contracts.ts.
// A single adapter instance can serve both roles in tests.
// ---------------------------------------------------------------------------

export interface RecordingAdapterOptions {
  /** Display name for the adapter (used in error messages). */
  name?: string;
  /** Broker mode — 'paper' | 'live' | 'synthetic'. Defaults to 'synthetic'. */
  mode?: 'paper' | 'live' | 'synthetic';
  /** Data tier. Defaults to 'free'. */
  tier?: 'free' | 'starter' | 'pro';
}

export class RecordingAdapter implements BrokerAdapter, DataAdapter {
  // ----- BrokerAdapter identity -------------------------------------------
  readonly name: string;
  readonly mode: 'paper' | 'live' | 'synthetic';

  // ----- DataAdapter identity ---------------------------------------------
  readonly tier: 'free' | 'starter' | 'pro';

  private readonly fixtures: FixtureMap;

  constructor(fixtures: FixtureMap, opts: RecordingAdapterOptions = {}) {
    this.fixtures = fixtures;
    this.name = opts.name ?? 'recording';
    this.mode = opts.mode ?? 'synthetic';
    this.tier = opts.tier ?? 'free';
  }

  // -------------------------------------------------------------------------
  // BrokerAdapter — read-only account + order history
  // -------------------------------------------------------------------------

  async getAccount(): Promise<Account> {
    return lookup<Account>(this.fixtures, this.name, fixtureKey('getAccount'));
  }

  async getPositions(): Promise<Position[]> {
    return lookup<Position[]>(this.fixtures, this.name, fixtureKey('getPositions'));
  }

  async getPosition(symbol: string): Promise<Position | null> {
    return lookup<Position | null>(this.fixtures, this.name, fixtureKey('getPosition', symbol));
  }

  async getOrders(opts?: {
    status?: 'open' | 'closed' | 'all';
    limit?: number;
  }): Promise<OrderRecord[]> {
    return lookup<OrderRecord[]>(this.fixtures, this.name, fixtureKey('getOrders', opts ?? {}));
  }

  // BrokerAdapter health
  async ping(): Promise<{ ok: true; latencyMs: number } | { ok: false; error: string }> {
    // ping is allowed to have a fixture or fall back to a trivial ok response.
    const key = fixtureKey('ping');
    if (key in this.fixtures) {
      return lookup<{ ok: true; latencyMs: number } | { ok: false; error: string }>(
        this.fixtures,
        this.name,
        key,
      );
    }
    return { ok: true as const, latencyMs: 0 };
  }

  // -------------------------------------------------------------------------
  // DataAdapter — market data
  // -------------------------------------------------------------------------

  async getBars(opts: {
    symbol: string;
    resolution: Resolution;
    from: number;
    to: number;
    extendedHours?: boolean;
  }): Promise<Bar[]> {
    return lookup<Bar[]>(this.fixtures, this.name, fixtureKey('getBars', opts));
  }

  async getQuote(symbol: string): Promise<Quote> {
    return lookup<Quote>(this.fixtures, this.name, fixtureKey('getQuote', symbol));
  }

  /** Subscribe to live quote updates. Recording adapter emits nothing (read-only / offline). */
  streamQuotes(_symbols: string[], _handler: (q: Quote) => void): () => void {
    // No live stream in a fixture adapter — return a no-op unsubscribe.
    return () => undefined;
  }

  async getSymbol(symbol: string): Promise<SymbolInfo> {
    return lookup<SymbolInfo>(this.fixtures, this.name, fixtureKey('getSymbol', symbol));
  }

  async search(
    query: string,
    opts?: { type?: SymbolInfo['type']; limit?: number },
  ): Promise<SymbolInfo[]> {
    return lookup<SymbolInfo[]>(this.fixtures, this.name, fixtureKey('search', query, opts ?? {}));
  }

  // DataAdapter connection status
  subscribeStatus(handler: (s: ConnectionStatus) => void): () => void {
    handler({ state: 'connected', since: Date.now() });
    return () => undefined;
  }

  lastTickAt(_symbol: string): number | null {
    return null;
  }

  // -------------------------------------------------------------------------
  // WRITE METHODS — intentionally absent.
  //
  // The following are NOT implemented and must NEVER be added:
  //   placeOrder, submitOrder, cancelOrder, replaceOrder, modifyOrder,
  //   closePosition, transfer, withdraw, streamOrders
  //
  // Lar is a read-only observability layer. See ../contracts.ts header.
  // -------------------------------------------------------------------------

  /**
   * Throws a DataError when called — documents that `getOptionsChain` may be
   * present on concrete adapters but is not fixtured here by default.
   * Override by adding a `fixtureKey('getOptionsChain', underlying, expiration)`
   * entry to the fixture map.
   */
  async getOptionsChain(underlying: string, expiration?: string): Promise<unknown> {
    const key = fixtureKey('getOptionsChain', underlying, expiration);
    if (key in this.fixtures) {
      return lookup<unknown>(this.fixtures, this.name, key);
    }
    throw new DataError(
      this.name,
      'unsupported',
      `RecordingAdapter: getOptionsChain not in fixtures for ${underlying}/${expiration ?? '*'}`,
    );
  }
}
