// Tools: get_symbol, search_symbols — read-only symbol metadata via DataAdapter.
//
// Gate: check({ name, mutating: false }) is called FIRST on every handler.

import { z } from 'zod';
import { SymbolArgsSchema, SearchSymbolsArgsSchema } from '../schema.js';
import type { ToolDef, ToolDeps, ToolResult } from './types.js';
import type { SymbolInfo } from '@lar/connector-finance';

export function symbolTool(deps: ToolDeps): ToolDef {
  return {
    name: 'get_symbol',
    description: 'Get symbol metadata (exchange, session, tick size, marginable/shortable flags).',
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
      const decision = deps.gate.check({ name: 'get_symbol', mutating: false });
      if (!decision.allowed) {
        return { ok: false, error: `[gate] ${decision.reason ?? 'denied'}` };
      }
      const data = await deps.data.getSymbol(args.symbol);
      return { ok: true, data };
    },
  };
}

export function searchSymbolsTool(deps: ToolDeps): ToolDef {
  return {
    name: 'search_symbols',
    description: 'Search for symbols by free-text query (name or ticker fragment).',
    inputSchema: SearchSymbolsArgsSchema,
    inputJsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1 },
        type: {
          type: 'string',
          enum: ['stock', 'etf', 'index', 'futures', 'forex', 'crypto', 'option'],
        },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
      required: ['query'],
      additionalProperties: false,
    },
    async handler(args: z.infer<typeof SearchSymbolsArgsSchema>): Promise<ToolResult> {
      const decision = deps.gate.check({ name: 'search_symbols', mutating: false });
      if (!decision.allowed) {
        return { ok: false, error: `[gate] ${decision.reason ?? 'denied'}` };
      }
      const opts: { type?: SymbolInfo['type']; limit?: number } = {};
      if (args.type) opts.type = args.type;
      if (args.limit) opts.limit = args.limit;
      const data = await deps.data.search(args.query, opts);
      return { ok: true, data };
    },
  };
}
