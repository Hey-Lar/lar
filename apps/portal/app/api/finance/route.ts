import { NextResponse } from 'next/server';
import { fetchFinanceSnapshot, demoSnapshot } from '@lar/connector-finance';
import { authorize } from '../../../lib/authz';

/**
 * Read-only money. If LUMINA_API_BASE points at a running Lumina API, the
 * Wealth block shows real net worth; otherwise it falls back to a realistic
 * demo snapshot so the dashboard is never empty. `connected` + the snapshot's
 * `source` let the UI badge whose data it is.
 * BRIGHT-LINE: GET only — Lar never moves money.
 */
export async function GET(req: Request) {
  const gate = authorize(req);
  if (!gate.ok) return gate.response;

  const base = process.env.LUMINA_API_BASE;
  if (base) {
    try {
      const snapshot = await fetchFinanceSnapshot(base);
      return NextResponse.json({ ok: true, connected: true, snapshot });
    } catch (e) {
      return NextResponse.json({
        ok: true,
        connected: false,
        snapshot: demoSnapshot(),
        error: (e as Error).message,
      });
    }
  }
  return NextResponse.json({ ok: true, connected: false, snapshot: demoSnapshot() });
}
