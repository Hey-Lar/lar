/**
 * READ-ONLY adapter type-contracts for Lar's finance connector.
 *
 * BRIGHT-LINE: this surface is read-only by construction.
 * Write/order/mutation methods (placeOrder, cancelOrder, replaceOrder,
 * closePosition, transfer, withdraw, etc.) are intentionally absent and
 * MUST NOT be added here. Lar never executes trades or moves money.
 *
 * Ported from the founder's invest-bot-personal design contracts:
 *   design/code/BrokerAdapter.ts  (read subset only)
 *   design/code/DataAdapter.ts    (full read surface)
 *   web/lib/types.ts              (supplementary shapes)
 */

// ---------------------------------------------------------------------------
// Supporting enums / small types
// ---------------------------------------------------------------------------

/**
 * Asset holding side — describes the direction of an *existing* position.
 * "buy" / "sell" are intentionally excluded; this is not an order-side type.
 */
export type HoldingSide = 'long' | 'short';

/** OHLCV bar (unix-second timestamps). */
export interface Bar {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Level-1 quote. */
export interface Quote {
  symbol: string;
  bid: number;
  bidSize: number;
  ask: number;
  askSize: number;
  last: number;
  timestamp: number; // unix ms
  session?: 'pre' | 'rth' | 'post' | 'closed';
}

/** Symbol metadata (mirrors TradingView UDF SymbolInfo). */
export interface SymbolInfo {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'index' | 'futures' | 'forex' | 'crypto' | 'option';
  exchange: string;
  currency: string;
  timezone: string; // e.g. "America/New_York"
  hasIntraday: boolean;
  minTick: number;
  pricescale: number;
  session: string; // TV format: "0930-1600:23456"
  marginable?: boolean;
  shortable?: boolean;
  optionable?: boolean;
}

/** Bar resolution string (minutes, or D/W/M). */
export type Resolution = '1' | '5' | '15' | '30' | '60' | '240' | 'D' | 'W' | 'M';

// ---------------------------------------------------------------------------
// Broker domain types (read-only — no order submission shapes)
// ---------------------------------------------------------------------------

/** A read-only record of a historical fill / order (status-only, not submission). */
export interface OrderRecord {
  orderId: string;
  clientOrderId?: string;
  status: 'accepted' | 'rejected' | 'pending' | 'filled' | 'partial' | 'canceled';
  filledQty: number;
  avgFillPrice?: number;
  submittedAt: string; // ISO
  message?: string;
}

/** An existing position held in the account. */
export interface Position {
  symbol: string;
  qty: number; // signed; negative = short
  avgEntryPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number; // session
  side: HoldingSide;
  costBasis: number;
}

/** Brokerage account summary. */
export interface Account {
  accountId: string;
  equity: number;
  cash: number;
  buyingPower: number;
  marginUsed: number;
  daytradesUsed: number; // last 5 sessions
  daytradesRemaining: number | null;
  patternDayTrader: boolean;
  isOptionsApproved: boolean;
  optionsTier?: 1 | 2 | 3 | 4;
  cryptoEnabled?: boolean;
  shortingEnabled?: boolean;
  currency: 'USD' | 'EUR' | 'GBP' | string;
}

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

/**
 * Connection-status discriminated union.
 * `since` is the unix-ms timestamp the adapter entered the current state.
 * `lastTickAt` is the unix-ms of the most recent quote (stale variant only).
 * `attempts` counts reconnect tries in the current burst.
 * `error` is the last error from the WS/REST layer when disconnected.
 */
export type ConnectionStatus =
  | { state: 'connected'; since: number }
  | { state: 'reconnecting'; since: number; attempts: number }
  | { state: 'stale'; since: number; lastTickAt?: number }
  | { state: 'disconnected'; since: number; error?: string };

/**
 * Pure staleness check — no I/O, no side-effects.
 *
 * Returns true when the connection is in a non-healthy state (reconnecting,
 * stale, disconnected) or when it is nominally "connected" but the most recent
 * tick predates `maxQuietMs` (default 15 s, matching the watchlist threshold).
 * Callers using REST-only adapters should pass a larger window (e.g. 60_000).
 */
export function isStale(status: ConnectionStatus, maxQuietMs = 15_000): boolean {
  if (status.state === 'reconnecting' || status.state === 'disconnected') return true;
  if (status.state === 'stale') return true;
  // status.state === "connected"
  // If the adapter informally extends the connected shape with lastTickAt,
  // honour it. The union type doesn't carry it; we use a runtime check so
  // this helper stays the single source of truth.
  const maybeLast = (status as { lastTickAt?: number }).lastTickAt;
  if (typeof maybeLast === 'number' && Date.now() - maybeLast > maxQuietMs) return true;
  return false;
}

// ---------------------------------------------------------------------------
// DataAdapter — read-only market-data interface
// ---------------------------------------------------------------------------

/**
 * Read-only market-data surface.
 * Provides OHLCV bars, quotes, symbol search, connection status, and health.
 * No write or mutation methods exist on this interface.
 */
export interface DataAdapter {
  readonly name: string;
  readonly tier: 'free' | 'starter' | 'pro';

  // OHLCV
  getBars(opts: {
    symbol: string;
    resolution: Resolution;
    from: number; // unix seconds
    to: number; // unix seconds
    extendedHours?: boolean;
  }): Promise<Bar[]>;

  // Quotes
  getQuote(symbol: string): Promise<Quote>;
  /** Subscribe to live quote updates; returns an unsubscribe function. */
  streamQuotes(symbols: string[], handler: (q: Quote) => void): () => void;

  // Symbol metadata
  getSymbol(symbol: string): Promise<SymbolInfo>;
  search(
    query: string,
    opts?: { type?: SymbolInfo['type']; limit?: number },
  ): Promise<SymbolInfo[]>;

  // Optional capabilities
  getOptionsChain?(underlying: string, expiration?: string): Promise<unknown>;

  // Rate limits
  readonly rateLimit?: { limit: number; remaining: number; resetAt: number };

  // Health
  ping(): Promise<{ ok: true; latencyMs: number } | { ok: false; error: string }>;

  /**
   * Subscribe to the connection-status feed. The handler is called
   * synchronously with the current status on subscribe (so a UI mounting
   * mid-session doesn't sit blank), then on every subsequent state transition.
   * Returns an unsubscribe function.
   * REST-only adapters should still emit 'connected' / 'stale' based on
   * heartbeat polling.
   */
  subscribeStatus(handler: (s: ConnectionStatus) => void): () => void;

  /** Unix-ms of the most recent quote for `symbol`, or null if never seen. */
  lastTickAt(symbol: string): number | null;
}

// ---------------------------------------------------------------------------
// BrokerAdapter — READ-ONLY subset
//
// INTENTIONALLY OMITTED (write/mutation paths):
//   placeOrder / submitOrder    — creates a new order
//   cancelOrder                 — cancels an open order
//   replaceOrder / modifyOrder  — modifies an open order
//   closePosition               — closes a position
//   transfer / withdraw         — moves funds
//   streamOrders (write-capable streaming) — replaced by read-only history
// ---------------------------------------------------------------------------

/**
 * Read-only broker surface.
 * Exposes account snapshot, existing positions, historical order records, and
 * health. No method on this interface submits, cancels, or modifies any order
 * or position.
 */
export interface BrokerAdapter {
  readonly name: string;
  readonly mode: 'paper' | 'live' | 'synthetic';

  // Account (read-only snapshot)
  getAccount(): Promise<Account>;
  getPositions(): Promise<Position[]>;
  getPosition(symbol: string): Promise<Position | null>;

  // Historical order records (read-only — no submission method)
  getOrders(opts?: { status?: 'open' | 'closed' | 'all'; limit?: number }): Promise<OrderRecord[]>;

  // Optional capabilities
  isShortable?(symbol: string): Promise<{ shortable: boolean; feeRate?: number }>;
  getOptionsChain?(underlying: string, expiration?: string): Promise<unknown>;

  // Rate limits
  readonly rateLimit?: { limit: number; remaining: number; resetAt: number };

  // Health
  ping(): Promise<{ ok: true; latencyMs: number } | { ok: false; error: string }>;
}
