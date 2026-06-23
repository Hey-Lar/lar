import { NextResponse } from 'next/server';
import { resolveTranslate } from '@lar/connector-translate';
import { authorize } from '../../../lib/authz';

/**
 * BRIGHT-LINE: read-only, keyless, route-outward.
 * Fetches a quick translation from MyMemory (no key, no token) and returns outward
 * links to dedicated translators. The MyMemory fetch happens HERE (server-side) so
 * the browser only calls same-origin /api/translate — the CSP connect-src list stays
 * unchanged. Lar stores nothing.
 *
 * Returns: { ok: true, result } or { ok: false, error } on any error.
 */
export async function GET(req: Request) {
  const gate = authorize(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const from = url.searchParams.get('from')?.trim() || 'en';
  const to = url.searchParams.get('to')?.trim() || 'es';

  try {
    const result = await resolveTranslate(q, from, to);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    // Don't echo raw upstream detail to the client (forward-looking: an
    // authenticated upstream could carry a key/URL). Log server-side, return a
    // friendly generic message.
    console.error('[api/translate] resolve failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Translation is temporarily unavailable.' },
      { status: 400 },
    );
  }
}
