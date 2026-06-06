/**
 * RecordingAdapter tests — read-only, in-memory fixture replay.
 *
 * Goals:
 *   1. getQuote / getBars / getAccount / getPositions return fixtured values.
 *   2. getOrders (read-only history) returns fixtured values.
 *   3. Missing fixture throws with a clear error message.
 *   4. Type-level + runtime assertion that NO write method exists on the adapter.
 *   5. subscribeStatus / lastTickAt / ping work without fixtures.
 *   6. Error-replay: a fixture value that is an Error instance is thrown.
 */

import { describe, it, expect } from 'vitest';
import { RecordingAdapter, fixtureKey, type FixtureMap } from './recording-adapter';
import type {
  Account,
  Position,
  Quote,
  Bar,
  OrderRecord,
  BrokerAdapter,
  DataAdapter,
} from '../contracts';

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

const sampleAccount: Account = {
  accountId: 'acct-test-1',
  equity: 50_000,
  cash: 20_000,
  buyingPower: 20_000,
  marginUsed: 0,
  daytradesUsed: 0,
  daytradesRemaining: null,
  patternDayTrader: false,
  isOptionsApproved: false,
  currency: 'USD',
};

const samplePosition: Position = {
  symbol: 'AAPL',
  qty: 10,
  avgEntryPrice: 180,
  marketValue: 1_830,
  unrealizedPnl: 30,
  realizedPnl: 0,
  side: 'long',
  costBasis: 1_800,
};

const sampleQuote: Quote = {
  symbol: 'AAPL',
  bid: 182.5,
  bidSize: 100,
  ask: 182.6,
  askSize: 200,
  last: 182.55,
  timestamp: 1_700_000_000_000,
};

const sampleBars: Bar[] = [
  { time: 1_699_920_000, open: 180, high: 185, low: 179, close: 183, volume: 50_000 },
  { time: 1_700_006_400, open: 183, high: 184, low: 181, close: 182, volume: 40_000 },
];

const sampleOrders: OrderRecord[] = [
  {
    orderId: 'ord-001',
    status: 'filled',
    filledQty: 10,
    avgFillPrice: 180,
    submittedAt: '2024-01-15T14:30:00.000Z',
  },
];

function makeFixtures(): FixtureMap {
  return {
    [fixtureKey('getAccount')]: sampleAccount,
    [fixtureKey('getPositions')]: [samplePosition],
    [fixtureKey('getPosition', 'AAPL')]: samplePosition,
    [fixtureKey('getPosition', 'MSFT')]: null,
    [fixtureKey('getOrders', {})]: sampleOrders,
    [fixtureKey('getQuote', 'AAPL')]: sampleQuote,
    [fixtureKey('getBars', {
      symbol: 'AAPL',
      resolution: 'D' as const,
      from: 1_699_920_000,
      to: 1_700_100_000,
    })]: sampleBars,
    [fixtureKey('getSymbol', 'AAPL')]: {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      type: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      timezone: 'America/New_York',
      hasIntraday: true,
      minTick: 0.01,
      pricescale: 100,
      session: '0930-1600:23456',
    },
    [fixtureKey('search', 'Apple', {})]: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RecordingAdapter — fixture replay', () => {
  it('getAccount() returns the fixtured account', async () => {
    const adapter = new RecordingAdapter(makeFixtures());
    const acct = await adapter.getAccount();
    expect(acct).toEqual(sampleAccount);
    expect(acct.accountId).toBe('acct-test-1');
    expect(acct.equity).toBe(50_000);
  });

  it('getPositions() returns the fixtured position list', async () => {
    const adapter = new RecordingAdapter(makeFixtures());
    const positions = await adapter.getPositions();
    expect(positions).toHaveLength(1);
    expect(positions[0].symbol).toBe('AAPL');
    expect(positions[0].qty).toBe(10);
  });

  it('getPosition(symbol) returns the specific fixtured position', async () => {
    const adapter = new RecordingAdapter(makeFixtures());
    const pos = await adapter.getPosition('AAPL');
    expect(pos).not.toBeNull();
    expect(pos?.avgEntryPrice).toBe(180);
  });

  it('getPosition(symbol) returns null for a symbol fixtured as null', async () => {
    const adapter = new RecordingAdapter(makeFixtures());
    const pos = await adapter.getPosition('MSFT');
    expect(pos).toBeNull();
  });

  it('getOrders() returns the fixtured order list', async () => {
    const adapter = new RecordingAdapter(makeFixtures());
    const orders = await adapter.getOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].orderId).toBe('ord-001');
    expect(orders[0].status).toBe('filled');
  });

  it('getQuote(symbol) returns the fixtured quote', async () => {
    const adapter = new RecordingAdapter(makeFixtures());
    const q = await adapter.getQuote('AAPL');
    expect(q.symbol).toBe('AAPL');
    expect(q.bid).toBe(182.5);
    expect(q.ask).toBe(182.6);
    expect(q.last).toBe(182.55);
  });

  it('getBars() returns the fixtured bars', async () => {
    const adapter = new RecordingAdapter(makeFixtures());
    const bars = await adapter.getBars({
      symbol: 'AAPL',
      resolution: 'D',
      from: 1_699_920_000,
      to: 1_700_100_000,
    });
    expect(bars).toHaveLength(2);
    expect(bars[0].close).toBe(183);
    expect(bars[1].open).toBe(183);
  });

  it('ping() returns ok without a fixture', async () => {
    const adapter = new RecordingAdapter({});
    const r = await adapter.ping();
    expect(r.ok).toBe(true);
  });

  it('ping() returns the fixtured value when present', async () => {
    const fixtures: FixtureMap = {
      [fixtureKey('ping')]: { ok: false, error: 'timeout' },
    };
    const adapter = new RecordingAdapter(fixtures);
    const r = await adapter.ping();
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Missing fixture → clear error
// ---------------------------------------------------------------------------

describe('RecordingAdapter — missing fixture error', () => {
  it('throws a BrokerError with a helpful message when the fixture is absent', async () => {
    const adapter = new RecordingAdapter({});
    await expect(adapter.getAccount()).rejects.toThrow(/No fixture for key/);
    await expect(adapter.getAccount()).rejects.toThrow(/getAccount/);
    await expect(adapter.getAccount()).rejects.toThrow(/fix\b|Fix/i);
  });

  it('throws for a missing getQuote fixture', async () => {
    const adapter = new RecordingAdapter({});
    await expect(adapter.getQuote('TSLA')).rejects.toThrow(/getQuote/);
  });

  it('throws for a missing getPositions fixture', async () => {
    const adapter = new RecordingAdapter({});
    await expect(adapter.getPositions()).rejects.toThrow(/getPositions/);
  });
});

// ---------------------------------------------------------------------------
// Error replay — fixture value is an Error instance
// ---------------------------------------------------------------------------

describe('RecordingAdapter — error replay', () => {
  it('throws the Error instance stored in the fixture map', async () => {
    const fixtures: FixtureMap = {
      [fixtureKey('getAccount')]: new Error('upstream unavailable'),
    };
    const adapter = new RecordingAdapter(fixtures);
    await expect(adapter.getAccount()).rejects.toThrow('upstream unavailable');
  });
});

// ---------------------------------------------------------------------------
// subscribeStatus / lastTickAt
// ---------------------------------------------------------------------------

describe('RecordingAdapter — connection status', () => {
  it('subscribeStatus calls handler synchronously with connected state', () => {
    const adapter = new RecordingAdapter({});
    const states: string[] = [];
    const unsub = adapter.subscribeStatus((s) => states.push(s.state));
    expect(states).toEqual(['connected']);
    unsub();
  });

  it('lastTickAt returns null for any symbol', () => {
    const adapter = new RecordingAdapter({});
    expect(adapter.lastTickAt('AAPL')).toBeNull();
    expect(adapter.lastTickAt('SPY')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// streamQuotes — no-op in the recording adapter
// ---------------------------------------------------------------------------

describe('RecordingAdapter — streamQuotes', () => {
  it('returns an unsubscribe function and emits no events', () => {
    const adapter = new RecordingAdapter({});
    const received: unknown[] = [];
    const unsub = adapter.streamQuotes(['AAPL'], (q) => received.push(q));
    expect(typeof unsub).toBe('function');
    unsub();
    expect(received).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Type-level + runtime: NO write methods on the adapter
// ---------------------------------------------------------------------------

describe('RecordingAdapter — read-only surface (no write methods)', () => {
  it('has NO write methods at runtime (key enumeration)', () => {
    const adapter = new RecordingAdapter({});

    // Enumerate all keys including prototype chain (own + inherited methods).
    const allKeys = new Set<string>();
    let proto: unknown = adapter;
    while (proto && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        allKeys.add(key);
      }
      proto = Object.getPrototypeOf(proto);
    }

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

    for (const method of writeMethods) {
      expect(allKeys).not.toContain(method);
    }
  });

  it('satisfies BrokerAdapter and DataAdapter interfaces (type-level)', () => {
    // If RecordingAdapter does NOT implement these interfaces, TypeScript will
    // fail here at compile time. This is the static contract test.
    const brokerAdapter: BrokerAdapter = new RecordingAdapter({});
    const dataAdapter: DataAdapter = new RecordingAdapter({});
    expect(brokerAdapter.name).toBe('recording');
    expect(dataAdapter.name).toBe('recording');
  });

  it('name and mode are readable on the instance', () => {
    const adapter = new RecordingAdapter({}, { name: 'my-broker', mode: 'paper' });
    expect(adapter.name).toBe('my-broker');
    expect(adapter.mode).toBe('paper');
  });
});

// ---------------------------------------------------------------------------
// fixtureKey helper — stability and differentiation
// ---------------------------------------------------------------------------

describe('fixtureKey()', () => {
  it('produces a stable key regardless of object key order', () => {
    const a = fixtureKey('getBars', { symbol: 'AAPL', resolution: 'D', from: 0, to: 1 });
    const b = fixtureKey('getBars', { resolution: 'D', symbol: 'AAPL', to: 1, from: 0 });
    expect(a).toBe(b);
  });

  it('differentiates different arg values', () => {
    const a = fixtureKey('getQuote', 'AAPL');
    const b = fixtureKey('getQuote', 'TSLA');
    expect(a).not.toBe(b);
  });

  it('differentiates different methods with same args', () => {
    const a = fixtureKey('getAccount');
    const b = fixtureKey('getPositions');
    expect(a).not.toBe(b);
  });
});
