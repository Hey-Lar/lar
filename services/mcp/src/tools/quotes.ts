// Tools: get_quote, get_bars — read-only market data via DataAdapter.
//
// Gate: check({ name, mutating: false }) is called FIRST on every handler.

import { z } from 'zod';
import { SymbolArgsSchema, GetBarsArgsSchema } from '../schema.js';
import type { ToolDef, ToolDeps, ToolResult } from './types.js';

export function quoteTool(deps: ToolDeps): ToolDef {
  return {
    name: 'get_quote',
    description: 'Get the current Level 1 quote (bid/ask/last) for a symbol.',
    inputSchema: SymbolArgsSchema,
    inputJsonSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Ticker symbol (e.g. AAPL, SPY).' },
      },
      required: ['symbol'],
      additionalProperties: false,
    },
    async handler(args: z.infer<typeof SymbolArgsSchema>): Promise<ToolResult> {
      const decision = deps.gate.check({ name: 'get_quote', mutating: false });
      if (!decision.allowed) {
        return { ok: false, error: `[gate] ${decision.reason ?? 'denied'}` };
      }
      const data = await deps.data.getQuote(args.symbol);
      return { ok: true, data };
    },
  };
}

export function barsTool(deps: ToolDeps): ToolDef {
  return {
    name: 'get_bars',
    description: 'Fetch OHLCV bars for a symbol between two unix-second timestamps.',
    inputSchema: GetBarsArgsSchema,
    inputJsonSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        resolution: {
          type: 'string',
          enum: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
        },
        from: { type: 'integer', minimum: 0, description: 'Unix timestamp in seconds.' },
        to: { type: 'integer', minimum: 0, description: 'Unix timestamp in seconds.' },
        extendedHours: { type: 'boolean' },
      },
      required: ['symbol', 'resolution', 'from', 'to'],
      additionalProperties: false,
    },
    async handler(args: z.infer<typeof GetBarsArgsSchema>): Promise<ToolResult> {
      const decision = deps.gate.check({ name: 'get_bars', mutating: false });
      if (!decision.allowed) {
        return { ok: false, error: `[gate] ${decision.reason ?? 'denied'}` };
      }
      const data = await deps.data.getBars(args);
      return { ok: true, data };
    },
  };
}
