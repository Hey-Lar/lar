// Tools: get_positions, get_position — read-only position data via BrokerAdapter.
//
// Gate: check({ name, mutating: false }) is called FIRST on every handler.

import { z } from 'zod';
import { EmptyArgsSchema, SymbolArgsSchema } from '../schema.js';
import type { ToolDef, ToolDeps, ToolResult } from './types.js';

export function positionsTool(deps: ToolDeps): ToolDef {
  return {
    name: 'get_positions',
    description: 'List all open positions (signed qty, avg entry, market value, unrealized PnL).',
    inputSchema: EmptyArgsSchema,
    inputJsonSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    async handler(_args: z.infer<typeof EmptyArgsSchema>): Promise<ToolResult> {
      const decision = deps.gate.check({ name: 'get_positions', mutating: false });
      if (!decision.allowed) {
        return { ok: false, error: `[gate] ${decision.reason ?? 'denied'}` };
      }
      const data = await deps.broker.getPositions();
      return { ok: true, data };
    },
  };
}

export function positionTool(deps: ToolDeps): ToolDef {
  return {
    name: 'get_position',
    description: 'Get the open position for a single symbol; returns null when flat.',
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
      const decision = deps.gate.check({ name: 'get_position', mutating: false });
      if (!decision.allowed) {
        return { ok: false, error: `[gate] ${decision.reason ?? 'denied'}` };
      }
      const data = await deps.broker.getPosition(args.symbol);
      return { ok: true, data };
    },
  };
}
