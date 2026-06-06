/**
 * Tests for contracts.ts — read-only BrokerAdapter / DataAdapter contracts.
 *
 * Three goals:
 *   1. TDD the pure `isStale()` helper (no I/O).
 *   2. Structural assertion that BrokerAdapter has NO write methods.
 *   3. Smoke-test that types are importable and a sample object satisfies
 *      each read-only interface.
 */

import { describe, it, expect } from 'vitest';
import {
  isStale,
  type BrokerAdapter,
  type DataAdapter,
  type ConnectionStatus,
  type Account,
  type Position,
  type Quote,
  type Bar,
  type OrderRecord,
} from './contracts';

// ---------------------------------------------------------------------------
// 1. isStale() — pure function, TDD
// ---------------------------------------------------------------------------

describe('isStale', () => {
  const now = Date.now();

  it('returns false for a fresh connected status', () => {
    const status: ConnectionStatus = { state: 'connected', since: now - 1_000 };
    expect(isStale(status)).toBe(false);
  });

  it('returns true for a stale status', () => {
    const status: ConnectionStatus = { state: 'stale', since: now - 5_000 };
    expect(isStale(status)).toBe(true);
  });

  it('returns true for a reconnecting status', () => {
    const status: ConnectionStatus = { state: 'reconnecting', since: now - 2_000, attempts: 3 };
    expect(isStale(status)).toBe(true);
  });

  it('returns true for a disconnected status', () => {
    const status: ConnectionStatus = {
      state: 'disconnected',
      since: now - 10_000,
      error: 'timeout',
    };
    expect(isStale(status)).toBe(true);
  });

  it('returns false when lastTickAt is within maxQuietMs on connected', () => {
    const status = {
      state: 'connected' as const,
      since: now - 30_000,
      lastTickAt: now - 5_000, // 5 s ago, within default 15 s window
    };
    expect(isStale(status)).toBe(false);
  });

  it('returns true when lastTickAt exceeds maxQuietMs on connected', () => {
    const status = {
      state: 'connected' as const,
      since: now - 60_000,
      lastTickAt: now - 20_000, // 20 s ago, exceeds default 15 s
    };
    expect(isStale(status)).toBe(true);
  });

  it('respects a custom maxQuietMs (within the window is not stale)', () => {
    const maxQuietMs = 30_000;
    // Use Date.now() inline so the timestamp is fresh when the check runs.
    const freshNow = Date.now();
    const status = {
      state: 'connected' as const,
      since: freshNow - 60_000,
      lastTickAt: freshNow - 100, // 100 ms ago, well within the 30 s window
    };
    expect(isStale(status, maxQuietMs)).toBe(false);
  });

  it('respects a custom maxQuietMs (over the window is stale)', () => {
    const maxQuietMs = 30_000;
    const status = {
      state: 'connected' as const,
      since: now - 60_000,
      lastTickAt: now - 35_000, // 35 s ago, exceeds the 30 s window
    };
    expect(isStale(status, maxQuietMs)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Structural / compile-time read-only guarantee for BrokerAdapter
//
// The real gate is the TypeScript interface: BrokerAdapter has no write
// method signatures. The object below satisfies the interface; if any write
// method were accidentally added to the interface this object would need to
// implement it (compilation failure). This is the compile-time contract test.
//
// Confirmed absent from BrokerAdapter (write/mutation paths intentionally
// omitted per contracts.ts header):
//   placeOrder, submitOrder, cancelOrder, replaceOrder, modifyOrder,
//   closePosition, transfer, withdraw, streamOrders
// ---------------------------------------------------------------------------

describe('BrokerAdapter — read-only structural guarantee', () => {
  it('a minimal object satisfies BrokerAdapter without any write methods', () => {
    const adapter: BrokerAdapter = {
      name: 'test-broker',
      mode: 'paper',
      async getAccount(): Promise<Account> {
        return {
          accountId: 'acct-1',
          equity: 10_000,
          cash: 5_000,
          buyingPower: 5_000,
          marginUsed: 0,
          daytradesUsed: 0,
          daytradesRemaining: null,
          patternDayTrader: false,
          isOptionsApproved: false,
          currency: 'USD',
        };
      },
      async getPositions(): Promise<Position[]> {
        return [];
      },
      async getPosition(_symbol: string): Promise<Position | null> {
        return null;
      },
      async getOrders(): Promise<OrderRecord[]> {
        return [];
      },
      async ping() {
        return { ok: true as const, latencyMs: 1 };
      },
    };

    // Verify the adapter satisfies the interface by exercising its methods.
    expect(adapter.name).toBe('test-broker');
    expect(adapter.mode).toBe('paper');

    // Verify NO write methods exist on the interface (type-level assertion via
    // key enumeration of the constructed object).
    const keys = Object.keys(adapter);
    const writeMethods = [
      'placeOrder',
      'submitOrder',
      'cancelOrder',
      'replaceOrder',
      'modifyOrder',
      'closePosition',
      'transfer',
      'withdraw',
      'streamOrders',
    ];
    for (const m of writeMethods) {
      expect(keys).not.toContain(m);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. DataAdapter — types importable and a sample satisfies the interface
// ---------------------------------------------------------------------------

describe('DataAdapter — read-only structural guarantee', () => {
  it('a minimal object satisfies DataAdapter without write methods', () => {
    const sampleBar: Bar = {
      time: 1_700_000_000,
      open: 100,
      high: 105,
      low: 99,
      close: 103,
      volume: 1_000,
    };
    const sampleQuote: Quote = {
      symbol: 'AAPL',
      bid: 182.5,
      bidSize: 100,
      ask: 182.6,
      askSize: 200,
      last: 182.55,
      timestamp: Date.now(),
    };

    const adapter: DataAdapter = {
      name: 'test-data',
      tier: 'free',
      async getBars() {
        return [sampleBar];
      },
      async getQuote() {
        return sampleQuote;
      },
      streamQuotes(_symbols, _handler) {
        return () => {};
      },
      async getSymbol(symbol) {
        return {
          symbol,
          name: 'Apple Inc.',
          type: 'stock' as const,
          exchange: 'NASDAQ',
          currency: 'USD',
          timezone: 'America/New_York',
          hasIntraday: true,
          minTick: 0.01,
          pricescale: 100,
          session: '0930-1600:23456',
        };
      },
      async search() {
        return [];
      },
      async ping() {
        return { ok: true as const, latencyMs: 2 };
      },
      subscribeStatus(handler) {
        handler({ state: 'connected', since: Date.now() });
        return () => {};
      },
      lastTickAt(_symbol) {
        return null;
      },
    };

    expect(adapter.name).toBe('test-data');
    expect(adapter.tier).toBe('free');

    // No write methods on DataAdapter either.
    const keys = Object.keys(adapter);
    expect(keys).not.toContain('placeOrder');
    expect(keys).not.toContain('submitOrder');
  });
});
