import { NextResponse } from 'next/server';
import { fetchFinanceSnapshot } from '@lar/connector-finance';

/**
 * Read-only money. If LUMINA_API_BASE points at a running Lumina API, the
 * Wealth block shows real net worth; otherwise it stays a styled shell.
 * BRIGHT-LINE: GET only — Lar never moves money.
 */
export async function GET() {
  const base = process.env.LUMINA_API_BASE;
  if (!base) {
    return NextResponse.json({ ok: true, connected: false, snapshot: null });
  }
  try {
    const snapshot = await fetchFinanceSnapshot(base);
    return NextResponse.json({ ok: true, connected: true, snapshot });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      connected: false,
      snapshot: null,
      error: (e as Error).message,
    });
  }
}
