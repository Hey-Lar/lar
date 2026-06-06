#!/usr/bin/env node
// @lar/mcp entrypoint — connects the MCP server to stdio transport.
//
// Default: runs with demoDeps() (RecordingAdapter fixture data, no credentials).
//
// Production upgrade path (gated follow-up):
//   Replace demoDeps() with a real read-only adapter, e.g.:
//     - YFinance-backed DataAdapter (keyless, public data)
//     - Polygon/TwelveData DataAdapter behind SerialQueue (requires API key
//       in env, gated by createGate with killSwitchEnv='LAR_MCP_KILL')
//     - Alpaca/IBKR BrokerAdapter with read-only API keys
//   The gate enforces read-only mode regardless of the adapter used.
//   Live adapters should set killSwitchEnv and maxStaleMs in the GateConfig.

import { demoDeps } from './index.js';
import { runStdio } from './server.js';

runStdio(demoDeps()).catch((err: unknown) => {
  process.stderr.write(`[lar/mcp] fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
