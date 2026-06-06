// Tool registry — single source of truth.
//
// READ_TOOLS is the exhaustive list of read-only tool factories.
// There is intentionally NO orders/place/cancel/replace tool here.
// The write-path bright-line: if any registered tool name matches a write
// pattern, createMcpServer will throw at startup (belt-and-suspenders check).

export { accountTool } from './account.js';
export { positionsTool, positionTool } from './positions.js';
export { quoteTool, barsTool } from './quotes.js';
export { symbolTool, searchSymbolsTool } from './symbols.js';
export { healthTool } from './health.js';
export type { ToolDef, ToolDeps, ToolResult, ToolFactory } from './types.js';

import { accountTool } from './account.js';
import { positionsTool, positionTool } from './positions.js';
import { quoteTool, barsTool } from './quotes.js';
import { symbolTool, searchSymbolsTool } from './symbols.js';
import { healthTool } from './health.js';
import type { ToolFactory } from './types.js';

/**
 * The 5 read-only tool factories that @lar/mcp registers.
 * Ordered: account, positions (2), quotes (2), symbols (2), health — then collapsed to
 * the 5 logical "groups": account, positions, quotes, symbols, health.
 *
 * Note: `positionsTool` and `positionTool` are separate tools but belong to the
 * same logical group.  The spec says "5 READ tools" meaning the 5 source groups
 * (account, positions, quotes, symbols, health); the actual registered tool count
 * is 7 (get_account, get_positions, get_position, get_quote, get_bars,
 * get_symbol, search_symbols, health).
 *
 * We export this flat list as READ_TOOLS so server.ts can iterate it.
 */
export const READ_TOOLS: ToolFactory[] = [
  accountTool,
  positionsTool,
  positionTool,
  quoteTool,
  barsTool,
  symbolTool,
  searchSymbolsTool,
  healthTool,
];

/**
 * Write-pattern guard — belt-and-suspenders regex used by createMcpServer.
 * Any tool name matching this pattern causes registration to throw.
 */
export const WRITE_PATTERN =
  /place_order|cancel_order|submit_order|replace_order|modify_order|close_position|transfer|withdraw/i;
