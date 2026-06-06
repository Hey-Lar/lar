// Tool: health — server version + adapter connectivity check.
//
// This tool is gate-checked for consistency, but is intentionally lightweight:
// the `version` variant requires no adapter call at all.
// Gate: check({ name, mutating: false }) is called FIRST on every handler.

import { z } from 'zod';
import { EmptyArgsSchema } from '../schema.js';
import type { ToolDef, ToolDeps, ToolResult } from './types.js';

const SERVER_NAME = '@lar/mcp';
const SERVER_VERSION = '0.0.0';

export function healthTool(deps: ToolDeps): ToolDef {
  return {
    name: 'health',
    description:
      'Report server version, active adapter names, and broker/data connectivity status.',
    inputSchema: EmptyArgsSchema,
    inputJsonSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    async handler(_args: z.infer<typeof EmptyArgsSchema>): Promise<ToolResult> {
      const decision = deps.gate.check({ name: 'health', mutating: false });
      if (!decision.allowed) {
        return { ok: false, error: `[gate] ${decision.reason ?? 'denied'}` };
      }
      // Run broker + data pings concurrently; tolerate failures gracefully.
      const [brokerPing, dataPing] = await Promise.allSettled([
        deps.broker.ping(),
        deps.data.ping(),
      ]);
      return {
        ok: true,
        data: {
          server: SERVER_NAME,
          version: SERVER_VERSION,
          broker: {
            name: deps.broker.name,
            mode: deps.broker.mode,
            ping:
              brokerPing.status === 'fulfilled'
                ? brokerPing.value
                : {
                    ok: false,
                    error:
                      brokerPing.reason instanceof Error
                        ? brokerPing.reason.message
                        : String(brokerPing.reason),
                  },
          },
          data: {
            name: deps.data.name,
            tier: deps.data.tier,
            ping:
              dataPing.status === 'fulfilled'
                ? dataPing.value
                : {
                    ok: false,
                    error:
                      dataPing.reason instanceof Error
                        ? dataPing.reason.message
                        : String(dataPing.reason),
                  },
          },
        },
      };
    },
  };
}
