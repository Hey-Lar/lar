// @lar/mcp — barrel export.
//
// Public surface:
//   createMcpServer  — factory for a configured McpServer (injectable deps)
//   runStdio         — connect + start listening on stdio transport
//   READ_TOOLS       — the 8-tool flat registry (account, positions×2,
//                      quotes×2, symbols×2, health) — no write tool exists
//   demoDeps()       — keyless demo wiring (RecordingAdapter + createGate)

export { createMcpServer, runStdio } from './server.js';
export {
  READ_TOOLS,
  WRITE_PATTERN,
  accountTool,
  positionsTool,
  positionTool,
  quoteTool,
  barsTool,
  symbolTool,
  searchSymbolsTool,
  healthTool,
} from './tools/index.js';
export type { ToolDef, ToolDeps, ToolResult, ToolFactory } from './tools/types.js';

import { createGate, InMemoryAuditLog } from '@lar/safety';
import { RecordingAdapter, fixtureKey, type FixtureMap } from '@lar/connector-finance';
import type { ToolDeps } from './tools/types.js';
import type { Account, Position, Quote, Bar, SymbolInfo } from '@lar/connector-finance';

// ---------------------------------------------------------------------------
// demoDeps() — keyless fixture wiring for zero-config demo / tests.
//
// A real read-only data adapter (e.g. YFinance-backed, Polygon behind
// SerialQueue, or TwelveData) is the gated follow-up.  The default is demo
// fixture data so the server runs KEYLESS out of the box.
// ---------------------------------------------------------------------------

function buildDemoFixtures(): FixtureMap {
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);

  const account: Account = {
    accountId: 'demo-acct-001',
    equity: 100_000,
    cash: 25_000,
    buyingPower: 50_000,
    marginUsed: 0,
    daytradesUsed: 0,
    daytradesRemaining: null,
    patternDayTrader: false,
    isOptionsApproved: false,
    currency: 'USD',
  };

  const positions: Position[] = [
    {
      symbol: 'AAPL',
      qty: 10,
      avgEntryPrice: 175.0,
      marketValue: 1820.0,
      unrealizedPnl: 70.0,
      realizedPnl: 0,
      side: 'long',
      costBasis: 1750.0,
    },
    {
      symbol: 'SPY',
      qty: 5,
      avgEntryPrice: 480.0,
      marketValue: 2420.0,
      unrealizedPnl: 20.0,
      realizedPnl: 0,
      side: 'long',
      costBasis: 2400.0,
    },
  ];

  const aaplQuote: Quote = {
    symbol: 'AAPL',
    bid: 181.5,
    bidSize: 100,
    ask: 182.0,
    askSize: 200,
    last: 181.8,
    timestamp: now,
    session: 'rth',
  };

  const spyQuote: Quote = {
    symbol: 'SPY',
    bid: 483.5,
    bidSize: 50,
    ask: 484.0,
    askSize: 100,
    last: 483.8,
    timestamp: now,
    session: 'rth',
  };

  const aaplBars: Bar[] = [
    { time: nowSec - 3600, open: 180.0, high: 183.0, low: 179.5, close: 181.8, volume: 12_000_000 },
    { time: nowSec - 7200, open: 178.5, high: 181.0, low: 178.0, close: 180.0, volume: 9_800_000 },
  ];

  const aaplInfo: SymbolInfo = {
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
    marginable: true,
    shortable: true,
    optionable: true,
  };

  const spyInfo: SymbolInfo = {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    type: 'etf',
    exchange: 'NYSE',
    currency: 'USD',
    timezone: 'America/New_York',
    hasIntraday: true,
    minTick: 0.01,
    pricescale: 100,
    session: '0930-1600:23456',
    marginable: true,
    shortable: true,
  };

  return {
    [fixtureKey('getAccount')]: account,
    [fixtureKey('getPositions')]: positions,
    [fixtureKey('getPosition', 'AAPL')]: positions[0],
    [fixtureKey('getPosition', 'SPY')]: positions[1],
    [fixtureKey('getPosition', 'MSFT')]: null,
    [fixtureKey('getOrders', {})]: [],
    [fixtureKey('getQuote', 'AAPL')]: aaplQuote,
    [fixtureKey('getQuote', 'SPY')]: spyQuote,
    [fixtureKey('getBars', {
      symbol: 'AAPL',
      resolution: '60',
      from: nowSec - 7200,
      to: nowSec,
    })]: aaplBars,
    [fixtureKey('getSymbol', 'AAPL')]: aaplInfo,
    [fixtureKey('getSymbol', 'SPY')]: spyInfo,
    [fixtureKey('search', 'AAPL', {})]: [aaplInfo],
    [fixtureKey('search', 'SPY', {})]: [spyInfo],
    [fixtureKey('search', 'apple', {})]: [aaplInfo],
  };
}

/**
 * Build a KEYLESS demo dependency bundle:
 *   - RecordingAdapter with in-memory fixtures (no real broker/data keys needed)
 *   - createGate() with InMemoryAuditLog (read-only, no kill-switch by default)
 *
 * Suitable for running the server without credentials, and for all tests.
 */
export function demoDeps(): ToolDeps {
  const audit = new InMemoryAuditLog();
  const gate = createGate({ readOnly: true, audit });
  const adapter = new RecordingAdapter(buildDemoFixtures(), {
    name: 'demo-recording',
    mode: 'synthetic',
    tier: 'free',
  });
  return { gate, broker: adapter, data: adapter };
}
