// Tool: get_account — read-only account snapshot via BrokerAdapter.
//
// Gate: check({ name: 'get_account', mutating: false }) is called FIRST.
// If the gate denies, returns an error result WITHOUT calling the adapter.

import { z } from 'zod';
import { EmptyArgsSchema } from '../schema.js';
import type { ToolDef, ToolDeps, ToolResult } from './types.js';

export function accountTool(deps: ToolDeps): ToolDef {
  return {
    name: 'get_account',
    description:
      'Get the current trading account snapshot (equity, cash, buying power, PDT status).',
    inputSchema: EmptyArgsSchema,
    inputJsonSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    async handler(_args: z.infer<typeof EmptyArgsSchema>): Promise<ToolResult> {
      // Gate check — MUST be first; fail-closed.
      const decision = deps.gate.check({ name: 'get_account', mutating: false });
      if (!decision.allowed) {
        return { ok: false, error: `[gate] ${decision.reason ?? 'denied'}` };
      }
      const data = await deps.broker.getAccount();
      return { ok: true, data };
    },
  };
}
