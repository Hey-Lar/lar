import { NextResponse } from 'next/server';
import { generateAgenda } from '../../../lib/agenda-demo';
import { authorize } from '../../../lib/authz';

/**
 * BRIGHT-LINE: Read-only, display-only. No event creation, update, or
 * deletion. Returns the demo schedule for today; will route through a
 * Calendar MCP once the user hands over OAuth.
 *
 * Returns: { ok, source, asOfMs, items: AgendaItem[] }
 */
export async function GET(req: Request) {
  const gate = authorize(req);
  if (!gate.ok) return gate.response;

  const asOfMs = Date.now();
  const items = generateAgenda(asOfMs);
  return NextResponse.json({
    ok: true,
    source: 'demo' as const,
    asOfMs,
    items,
  });
}
