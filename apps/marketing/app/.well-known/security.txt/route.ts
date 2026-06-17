/**
 * /.well-known/security.txt (RFC 9116) — responsible-disclosure contact. On-brand for a
 * privacy-first product: tell researchers exactly how to report a vulnerability.
 * Update `Expires` (must be < 1 year out) and point Contact at a monitored inbox.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://heylar.ai';

const BODY = `Contact: mailto:alberto@heylar.ai
Expires: 2027-06-17T00:00:00.000Z
Preferred-Languages: en
Canonical: ${SITE}/.well-known/security.txt
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
}
