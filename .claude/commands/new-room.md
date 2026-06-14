---
description: Scaffold a new route-outward Room — a @lar/connector-<x> package + a portal block/tab + parser intents + tests + browser-verify — mirroring the existing connectors (books/film/places/dictionary). The most-repeated unit of work; runs inside the ship-increment loop.
argument-hint: "<room name + source, e.g. 'news (keyless, neutral sources)'>"
---

# /new-room — scaffold a route-outward Room

A **Room** is a vertical capability (a tab the user sees); its **Door** is the
`@lar/connector-<x>` package that routes the user OUTWARD. This is the unit we've
built ~8 times (music · podcasts · books · film · places · dictionary · weather).
Mirror them exactly — do NOT invent a new shape.

**Room to build:** $ARGUMENTS

## Reference (read these first, copy the shape)

- A connector: `packages/connectors/books` — `src/index.ts`, an API client
  (`openlibrary.ts`), a pure total link-builder + `resolve*`, and
  `resolve.test.ts` (+ one `LAR_LIVE`-gated live test). `package.json` =
  `@lar/connector-<x>`, `"type":"module"`, deps `{ "@lar/shared": "*" }`.
- The contract: `@lar/shared` — add the `'<domain>'` + entity to the `LarAction`
  types and `ENTITY_FOR_DOMAIN` (keep it exhaustive).
- The parser: `packages/connectors/music/src/intent.ts` — add the trigger words
  for the new domain and strip them from `entity.query`.
- The portal: a `*Block.tsx` built on `lib/useAskLar.ts` + `components/AskBar.tsx`
  (a block now = `useAskLar<XResolution>({kind,forceDomain,initial})` plus
  `<AskBar/>` plus its card), the `/api/lar` `forceDomain:'<domain>'` branch, and a
  tab added to `Dashboard.tsx` + the Overview quick-launch grid.

## Steps (run via the ship-increment loop)

1. **Plan** (planner) — name the keyless data source (license must be permissive;
   prefer no key), the domain/entity, the link set (lead with the **neutral
   anti-lock-in** option, like WorldCat/JustWatch), the files, and risks.
2. **Connector** (builder, TDD) — new `@lar/connector-<x>` workspace:
   - a typed API client that **fails loud** on a missing/`404` result before any
     array access (`noUncheckedIndexedAccess`);
   - a **pure, total** link-builder returning `Record<XLink,string>`, every URL
     `encodeURIComponent`-safe;
   - `resolveX` tying them together; vitest specs + one `LAR_LIVE`-gated live test.
   - Register the workspace path in root `package.json` if needed.
3. **Contract + parser** (builder, TDD) — add the domain/entity to `@lar/shared`;
   teach `intent.ts` the triggers (+ strip them); keep the music wedge's existing
   specs green (blocks send `forceDomain`, so zero risk to them).
4. **Portal block + tab** (builder + designer) — `XBlock.tsx` via `useAskLar` +
   `<AskBar>` + a card using **only `@lar/ui` tokens + `<Icon>` (NEVER emojis)**;
   the `/api/lar` `forceDomain` branch (fetch **server-side** so the CSP
   `connect-src` is unchanged + `authorize()`-gated); add the tab + Overview tile.
5. **Review** — reviewer (spec+quality) + security (bright-lines, especially:
   links only, never host/stream/sell; keyless; server-side fetch; no stored PII).
6. **Browser-verify** (designer, Chrome MCP) — the new tab resolves a real query
   live, the neutral-source CTA renders, `--hearth` resolves, **no CSP
   violations**, themed correctly.
7. **Merge `--no-ff` + docs-scribe** — update HANDOFF (new connector bullet, tab
   count, test count) in the same commit. Do **not** push.

## Bright-line for Rooms

Lar is a **controller/router** — the Room routes OUTWARD via deep-link / official
API only. **Never host, stream, embed, or sell** others' content; keyless-first;
read-only; store no query/location/PII. Design is `@lar/ui` + `<Icon>`, never an
emoji.
