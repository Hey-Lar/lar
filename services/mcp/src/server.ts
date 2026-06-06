// @lar/mcp — read-only MCP server.
//
// Uses the McpServer high-level API from @modelcontextprotocol/sdk v1.x.
// Every tool is gated via @lar/safety createGate before any adapter call.
//
// SDK API note (vs. source invest-bot-personal which uses the low-level
// Server + setRequestHandler pattern):
//   - v1.29.0 ships McpServer with registerTool / tool(). We call
//     McpServer.tool(name, description, schema, cb) and route through our
//     ToolDef handlers so the gate logic lives in each tool.
//     Note: this overload is marked @deprecated in the SDK in favor of
//     registerTool — migrate later when the API stabilises.
//   - The low-level Server class is still available but is now deprecated for
//     basic usage. We use McpServer here; it wraps Server internally.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { READ_TOOLS, WRITE_PATTERN } from './tools/index.js';
import type { ToolDeps } from './tools/types.js';

const SERVER_NAME = '@lar/mcp';
export const SERVER_VERSION = '0.0.0';

// ---------------------------------------------------------------------------
// Guard: detect any accidentally registered write tool name.
// ---------------------------------------------------------------------------

function assertNoWriteTool(name: string): void {
  if (WRITE_PATTERN.test(name)) {
    throw new Error(
      `[lar/mcp] SAFETY: attempted to register a write tool "${name}". ` +
        'Only read tools may be registered. Remove this tool or rename it.',
    );
  }
}

// ---------------------------------------------------------------------------
// Factory — injectable for tests.
// ---------------------------------------------------------------------------

/**
 * Create and configure an McpServer with all READ_TOOLS registered.
 *
 * @param deps - Gate + read-only adapters injected at construction time.
 *               Use demoDeps() for a keyless demo or tests.
 * @returns A configured McpServer (not yet connected to a transport).
 */
export function createMcpServer(deps: ToolDeps): McpServer {
  const mcpServer = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  // Instantiate every tool factory with injected deps and register.
  for (const factory of READ_TOOLS) {
    const tool = factory(deps);

    // Belt-and-suspenders: throw if a write tool somehow slipped in.
    assertNoWriteTool(tool.name);

    // Register with McpServer using the tool's own Zod schema as an object shape.
    // McpServer.tool() accepts a ZodRawShape (Record<string, ZodTypeAny>), so we
    // unwrap the Zod schema into a shape when needed, or use z.object({}) for
    // empty-args tools. Uses McpServer.tool(); the SDK marks this overload
    // deprecated in favor of registerTool — migrate later.
    const zodShape = buildZodShape(tool);

    mcpServer.tool(tool.name, tool.description, zodShape, async (args: Record<string, unknown>) => {
      // The McpServer validates args via Zod before calling us.
      // We still call tool.handler which runs the gate check internally.
      const result = await tool.handler(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: !result.ok,
      };
    });

    process.stderr.write(`[lar/mcp] registered tool: ${tool.name}\n`);
  }

  return mcpServer;
}

// ---------------------------------------------------------------------------
// Helper: extract a ZodRawShape from a ToolDef's inputSchema.
// McpServer.tool() requires a ZodRawShape (flat object of ZodTypeAny values),
// not a ZodObject instance directly.  We unwrap z.object() schemas.
// ---------------------------------------------------------------------------

function buildZodShape(
  tool: ReturnType<(typeof READ_TOOLS)[number]>,
): Record<string, z.ZodTypeAny> {
  const schema = tool.inputSchema;
  // If it's a ZodObject, extract its shape.
  if (schema instanceof z.ZodObject) {
    return schema.shape as Record<string, z.ZodTypeAny>;
  }
  // ZodEffects wrapping a ZodObject (e.g. .refine()) — unwrap the inner type.
  if (schema instanceof z.ZodEffects) {
    const inner = schema.innerType();
    if (inner instanceof z.ZodObject) {
      return inner.shape as Record<string, z.ZodTypeAny>;
    }
  }
  // Fallback: empty shape (handler receives empty args).
  return {};
}

// ---------------------------------------------------------------------------
// runStdio — connect to stdio transport and start serving.
// ---------------------------------------------------------------------------

export async function runStdio(deps: ToolDeps): Promise<void> {
  const mcpServer = createMcpServer(deps);
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  process.stderr.write(`[lar/mcp] ${SERVER_NAME} v${SERVER_VERSION} listening on stdio\n`);
}
