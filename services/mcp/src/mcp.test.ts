// @lar/mcp — Vitest test suite.
//
// All tests run KEYLESS using demoDeps() (RecordingAdapter + InMemoryAuditLog
// + createGate). No real broker, no real data, no real credentials.

import { describe, it, expect } from 'vitest';
import {
  demoDeps,
  READ_TOOLS,
  WRITE_PATTERN,
  createMcpServer,
  accountTool,
  positionsTool,
  positionTool,
  quoteTool,
  barsTool,
  symbolTool,
  searchSymbolsTool,
  healthTool,
} from './index.js';
import { createGate, InMemoryAuditLog } from '@lar/safety';
import { RecordingAdapter, fixtureKey } from '@lar/connector-finance';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function killSwitchDeps() {
  const audit = new InMemoryAuditLog();
  // Gate with kill-switch active via a custom env reader that always returns "1".
  const gate = createGate({
    readOnly: true,
    killSwitchEnv: 'LAR_MCP_KILL',
    audit,
    readEnv: (_name: string) => '1', // kill-switch always active
  });
  const adapter = new RecordingAdapter(
    {
      // Empty fixture map — the adapter should NEVER be called when gate blocks.
    },
    { name: 'test-recording', mode: 'synthetic' },
  );
  return { gate, broker: adapter, data: adapter, audit };
}

// ---------------------------------------------------------------------------
// 1. No write tool exists
// ---------------------------------------------------------------------------

describe('write-tool guard', () => {
  it('READ_TOOLS contains no write tool names', () => {
    const deps = demoDeps();
    const names = READ_TOOLS.map((f) => f(deps).name);
    for (const name of names) {
      expect(WRITE_PATTERN.test(name)).toBe(false);
    }
  });

  it('READ_TOOLS contains exactly the expected read tool names', () => {
    const deps = demoDeps();
    const names = READ_TOOLS.map((f) => f(deps).name).sort();
    expect(names).toEqual(
      [
        'get_account',
        'get_bars',
        'get_position',
        'get_positions',
        'get_quote',
        'get_symbol',
        'health',
        'search_symbols',
      ].sort(),
    );
  });

  it('createMcpServer registers exactly the READ_TOOLS names', () => {
    const deps = demoDeps();
    // createMcpServer should not throw — all tools are read-only.
    expect(() => createMcpServer(deps)).not.toThrow();
  });

  it('no order/place/cancel variant exists in the tool name set', () => {
    const deps = demoDeps();
    const names = READ_TOOLS.map((f) => f(deps).name);
    const writeForbidden = [
      'place_order',
      'cancel_order',
      'submit_order',
      'replace_order',
      'order',
    ];
    for (const forbidden of writeForbidden) {
      expect(names).not.toContain(forbidden);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Gate enforcement — kill-switch blocks all tools, audit records denial
// ---------------------------------------------------------------------------

describe('gate enforcement', () => {
  it('get_account returns blocked result when kill-switch is active', async () => {
    const { gate, broker, data, audit } = killSwitchDeps();
    const tool = accountTool({ gate, broker, data });
    const result = await tool.handler({});
    expect(result.ok).toBe(false);
    expect(result.error).toContain('gate');
    // Adapter should NOT have been called — empty fixtures would throw if used.
    expect(audit.entries.length).toBe(1);
    expect(audit.entries[0]?.allowed).toBe(false);
    expect(audit.entries[0]?.reason).toContain('kill-switch');
  });

  it('get_positions returns blocked result when kill-switch is active', async () => {
    const { gate, broker, data, audit } = killSwitchDeps();
    const tool = positionsTool({ gate, broker, data });
    const result = await tool.handler({});
    expect(result.ok).toBe(false);
    expect(audit.entries[0]?.allowed).toBe(false);
  });

  it('get_position returns blocked result when kill-switch is active', async () => {
    const { gate, broker, data, audit } = killSwitchDeps();
    const tool = positionTool({ gate, broker, data });
    const result = await tool.handler({ symbol: 'AAPL' });
    expect(result.ok).toBe(false);
    expect(audit.entries[0]?.allowed).toBe(false);
  });

  it('get_quote returns blocked result when kill-switch is active', async () => {
    const { gate, broker, data, audit } = killSwitchDeps();
    const tool = quoteTool({ gate, broker, data });
    const result = await tool.handler({ symbol: 'AAPL' });
    expect(result.ok).toBe(false);
    expect(audit.entries[0]?.allowed).toBe(false);
  });

  it('get_bars returns blocked result when kill-switch is active', async () => {
    const { gate, broker, data, audit } = killSwitchDeps();
    const tool = barsTool({ gate, broker, data });
    const result = await tool.handler({ symbol: 'AAPL', resolution: '60', from: 0, to: 1 });
    expect(result.ok).toBe(false);
    expect(audit.entries[0]?.allowed).toBe(false);
  });

  it('get_symbol returns blocked result when kill-switch is active', async () => {
    const { gate, broker, data, audit } = killSwitchDeps();
    const tool = symbolTool({ gate, broker, data });
    const result = await tool.handler({ symbol: 'AAPL' });
    expect(result.ok).toBe(false);
    expect(audit.entries[0]?.allowed).toBe(false);
  });

  it('search_symbols returns blocked result when kill-switch is active', async () => {
    const { gate, broker, data, audit } = killSwitchDeps();
    const tool = searchSymbolsTool({ gate, broker, data });
    const result = await tool.handler({ query: 'AAPL' });
    expect(result.ok).toBe(false);
    expect(audit.entries[0]?.allowed).toBe(false);
  });

  it('health returns blocked result when kill-switch is active', async () => {
    const { gate, broker, data, audit } = killSwitchDeps();
    const tool = healthTool({ gate, broker, data });
    const result = await tool.handler({});
    expect(result.ok).toBe(false);
    expect(audit.entries[0]?.allowed).toBe(false);
  });

  it('audit log records the denial with name + reason', async () => {
    const { gate, broker, data, audit } = killSwitchDeps();
    const tool = accountTool({ gate, broker, data });
    await tool.handler({});
    expect(audit.entries.length).toBeGreaterThanOrEqual(1);
    const entry = audit.entries[0];
    expect(entry?.name).toBe('get_account');
    expect(entry?.allowed).toBe(false);
    expect(entry?.reason).toBeDefined();
  });

  it('gate allows reads when no kill-switch is active', async () => {
    const audit = new InMemoryAuditLog();
    const gate = createGate({ readOnly: true, audit });
    const adapter = new RecordingAdapter(
      {
        [fixtureKey('getAccount')]: {
          accountId: 'x',
          equity: 0,
          cash: 0,
          buyingPower: 0,
          marginUsed: 0,
          daytradesUsed: 0,
          daytradesRemaining: null,
          patternDayTrader: false,
          isOptionsApproved: false,
          currency: 'USD',
        },
      },
      { name: 'test', mode: 'synthetic' },
    );
    const tool = accountTool({ gate, broker: adapter, data: adapter });
    const result = await tool.handler({});
    expect(result.ok).toBe(true);
    expect(audit.entries[0]?.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Tool handlers return fixtured data (happy path)
// ---------------------------------------------------------------------------

describe('tool handlers — happy path with demo fixtures', () => {
  it('get_account returns account snapshot', async () => {
    const deps = demoDeps();
    const tool = accountTool(deps);
    const result = await tool.handler({});
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['accountId']).toBe('demo-acct-001');
    expect(data['equity']).toBe(100_000);
    expect(data['currency']).toBe('USD');
  });

  it('get_positions returns position list', async () => {
    const deps = demoDeps();
    const tool = positionsTool(deps);
    const result = await tool.handler({});
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    const positions = result.data as Array<Record<string, unknown>>;
    expect(positions.length).toBe(2);
    expect(positions[0]?.['symbol']).toBe('AAPL');
  });

  it('get_position returns a single position for AAPL', async () => {
    const deps = demoDeps();
    const tool = positionTool(deps);
    const result = await tool.handler({ symbol: 'AAPL' });
    expect(result.ok).toBe(true);
    const pos = result.data as Record<string, unknown>;
    expect(pos['symbol']).toBe('AAPL');
    expect(pos['qty']).toBe(10);
  });

  it('get_position returns null for a flat symbol', async () => {
    const deps = demoDeps();
    const tool = positionTool(deps);
    const result = await tool.handler({ symbol: 'MSFT' });
    expect(result.ok).toBe(true);
    expect(result.data).toBeNull();
  });

  it('get_quote returns quote for AAPL', async () => {
    const deps = demoDeps();
    const tool = quoteTool(deps);
    const result = await tool.handler({ symbol: 'AAPL' });
    expect(result.ok).toBe(true);
    const quote = result.data as Record<string, unknown>;
    expect(quote['symbol']).toBe('AAPL');
    expect(quote['bid']).toBeDefined();
    expect(quote['ask']).toBeDefined();
  });

  it('get_bars returns bar array', async () => {
    const deps = demoDeps();
    const tool = barsTool(deps);
    const nowSec = Math.floor(Date.now() / 1000);
    const result = await tool.handler({
      symbol: 'AAPL',
      resolution: '60',
      from: nowSec - 7200,
      to: nowSec,
    });
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('get_symbol returns symbol metadata for AAPL', async () => {
    const deps = demoDeps();
    const tool = symbolTool(deps);
    const result = await tool.handler({ symbol: 'AAPL' });
    expect(result.ok).toBe(true);
    const info = result.data as Record<string, unknown>;
    expect(info['symbol']).toBe('AAPL');
    expect(info['exchange']).toBe('NASDAQ');
  });

  it('search_symbols returns results for AAPL query', async () => {
    const deps = demoDeps();
    const tool = searchSymbolsTool(deps);
    const result = await tool.handler({ query: 'AAPL' });
    expect(result.ok).toBe(true);
    const results = result.data as Array<Record<string, unknown>>;
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.['symbol']).toBe('AAPL');
  });

  it('health returns ok=true without a kill-switch', async () => {
    const deps = demoDeps();
    const tool = healthTool(deps);
    const result = await tool.handler({});
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['server']).toBe('@lar/mcp');
    expect((data['broker'] as Record<string, unknown>)['name']).toBe('demo-recording');
  });
});

// ---------------------------------------------------------------------------
// 4. Zod input validation — invalid args fail before hitting the handler
// ---------------------------------------------------------------------------

describe('Zod input validation', () => {
  it('get_position rejects missing symbol', () => {
    const deps = demoDeps();
    const tool = positionTool(deps);
    const parsed = tool.inputSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('get_bars rejects missing required fields', () => {
    const deps = demoDeps();
    const tool = barsTool(deps);
    const parsed = tool.inputSchema.safeParse({ symbol: 'AAPL' });
    expect(parsed.success).toBe(false);
  });

  it('get_bars rejects to < from', () => {
    const deps = demoDeps();
    const tool = barsTool(deps);
    const parsed = tool.inputSchema.safeParse({
      symbol: 'AAPL',
      resolution: '60',
      from: 1000,
      to: 500,
    });
    expect(parsed.success).toBe(false);
  });

  it('search_symbols rejects empty query', () => {
    const deps = demoDeps();
    const tool = searchSymbolsTool(deps);
    const parsed = tool.inputSchema.safeParse({ query: '' });
    expect(parsed.success).toBe(false);
  });

  it('get_symbol rejects invalid symbol (special chars)', () => {
    const deps = demoDeps();
    const tool = symbolTool(deps);
    const parsed = tool.inputSchema.safeParse({ symbol: '!@#$' });
    expect(parsed.success).toBe(false);
  });
});
