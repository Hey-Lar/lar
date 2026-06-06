// Shared ToolDef type for the registry in server.ts.
// Each tool is a pure factory function that receives injected deps and returns
// a ToolDef. This keeps tools testable without a live adapter or gate.

import type { ZodTypeAny } from 'zod';
import type { BrokerAdapter, DataAdapter } from '@lar/connector-finance';
import type { GateConfig } from '@lar/safety';

// ---------------------------------------------------------------------------
// ToolDef — the shape every tool factory produces
// ---------------------------------------------------------------------------

export interface ToolDef {
  /** snake_case MCP tool name. */
  name: string;
  /** One-sentence, verb-first description. */
  description: string;
  /** Zod schema for runtime validation of args. */
  inputSchema: ZodTypeAny;
  /** JSON Schema for tools/list discovery. */
  inputJsonSchema: Record<string, unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: handler args are pre-validated by inputSchema at call site
  handler: (args: any) => Promise<ToolResult>;
}

/** Shape returned by every tool handler. */
export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

// ---------------------------------------------------------------------------
// ToolDeps — dependency bundle injected into each tool factory
// ---------------------------------------------------------------------------

export interface ToolDeps {
  /** Fail-closed gate — check MUST be called before every adapter call. */
  gate: ReturnType<typeof import('@lar/safety').createGate>;
  /** Read-only broker adapter (account, positions, order history). */
  broker: BrokerAdapter;
  /** Read-only market-data adapter (quotes, bars, symbols). */
  data: DataAdapter;
}

/** Factory function signature for every read tool. */
export type ToolFactory = (deps: ToolDeps) => ToolDef;

// Re-export GateConfig for convenience in demo wiring.
export type { GateConfig };
