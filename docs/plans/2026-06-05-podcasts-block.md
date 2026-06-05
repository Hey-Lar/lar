# Plan — Podcasts block (keyless)

**Goal:** add Lar's second media block — **Podcasts** — following the proven Music
pattern, fully keyless and test-driven. Podcasts are "open RSS, fully ownable"
(`docs/01` §5), so the route-outward value here is: direct Apple Podcasts link +
the **RSS feed** (the platform-neutral, truly-ownable artifact) + "find on"
search links for other apps.

**Branch:** `feat/podcasts-block`. **Bright-line:** resolve + build links only;
never stream or proxy audio.

## Conventions (all tasks)

- Repo root: `C:\Users\Amari\Desktop\HeyLar.ai\Lar`. npm workspaces + Turborepo.
- TypeScript strict, ESM (`"type": "module"`), package `main`/`types` → `src/index.ts`.
- Tests: **Vitest, TDD (tests first)**. Mock `fetch` for unit tests; gate any live
  network test behind `process.env.LAR_LIVE === '1'` with `it.skipIf`.
- Prettier: single quotes, semicolons, width 100, trailing-comma all. Run
  `npx prettier --write` on changed files; `npm run typecheck` must pass.
- After adding a new package, run `npm install` at root so the workspace links.
- Reference implementation to mirror: `packages/connectors/music` (itunes.ts,
  odesli.ts, resolve.ts, intent.ts, + their tests). The shared contract is
  `@lar/shared` (`LarAction`, `parseLarAction`, `Platform`, domains include
  `podcast`, entity types include `show`/`episode`).
- Conventional-commit messages.

---

## Task 1 — `packages/connectors/podcasts` (keyless resolver + tests)

Create a new workspace package `@lar/connector-podcasts` mirroring the structure
of `@lar/connector-music`.

**Files:**

- `package.json` — name `@lar/connector-podcasts`, type module, main/types
  `./src/index.ts`, scripts `build`/`typecheck`/`test` (same as connector-music),
  dependency `"@lar/shared": "*"`.
- `tsconfig.json` — extend `../../../tsconfig.base.json`, `outDir dist`,
  `rootDir src`, `lib: ["ES2022","DOM"]`, exclude tests.
- `src/itunes-podcasts.ts`:
  - `export interface PodcastSeed { title; author; artworkUrl?; applePodcastsUrl;
feedUrl?; genre?; }`
  - `export async function searchPodcast(query: string, fetchImpl = fetch):
Promise<PodcastSeed>` — GET
    `https://itunes.apple.com/search?media=podcast&entity=podcast&limit=1&term=<enc>`.
    Map `collectionName`→title, `artistName`→author, `artworkUrl600||artworkUrl100`
    →artworkUrl, `collectionViewUrl`→applePodcastsUrl, `feedUrl`→feedUrl,
    `primaryGenreName`→genre. Throw `No podcast found for "<query>"` if no result
    or no `collectionViewUrl`. Non-2xx → throw `iTunes podcast search failed: HTTP <status>`.
- `src/resolve.ts`:
  - `export interface PodcastResolution { title; author; artworkUrl?;
applePodcastsUrl; feedUrl?; genre?; links: Record<string,string>; }`
  - `export async function resolvePodcast(action: LarAction, fetchImpl = fetch):
Promise<PodcastResolution>` — uses `action.entity.query` → `searchPodcast` →
    builds `links`: - `apple_podcasts`: the `applePodcastsUrl` (direct). - `rss`: the `feedUrl` if present (the ownable artifact). - `spotify`: `https://open.spotify.com/search/<enc query>` (find-on search). - `youtube`: `https://www.youtube.com/results?search_query=<enc query>+podcast`.
    Only include keys whose URL exists. Bright-line comment: links only, no audio.
  - `export function buildPodcastLinks(seed: PodcastSeed): Record<string,string>`
    — pure helper (so it is unit-testable without network).
- `src/index.ts` — export `searchPodcast`, `resolvePodcast`, `buildPodcastLinks`,
  and the types.
- `src/resolve.test.ts` — Vitest, TDD:
  - `buildPodcastLinks` (pure): includes `apple_podcasts` always; includes `rss`
    only when `feedUrl` set; always includes `spotify` + `youtube` search links.
  - `resolvePodcast` with a mocked fetch (fake iTunes payload) → correct title/
    author/applePodcastsUrl/links; query with no result → rejects.
  - A **gated live smoke** (`it.skipIf(process.env.LAR_LIVE !== '1')`) that calls
    `resolvePodcast` for `"The Daily"` and asserts `applePodcastsUrl` contains
    `podcasts.apple.com` and `title.length > 0`. Timeout 20000.

**Acceptance:** `npx vitest run` green in the package; `npm run typecheck` clean;
prettier clean. No portal changes in this task.

---

## Task 2 — Wire Podcasts into `apps/portal`

- `app/api/lar/route.ts`: accept optional `forceDomain?: 'music' | 'podcast'` in
  the POST body; if `forceDomain` is set, override `action.domain` to it (re-derive
  via `{ ...action, domain }` — keep the rest). Route by domain:
  - `podcast` + launchable intent → `resolvePodcast(action)` → return
    `{ ok, kind: 'podcast', action, resolution }`.
  - `music` (as today) → `{ ok, kind: 'music', action, resolution }`.
  - non-launchable → `{ ok, kind: action.domain, action, resolution: null, note }`.
  - Keep the existing music behavior intact (back-compat: `resolution` still present).
- `components/MusicBlock.tsx`: defensively ignore non-music `kind` (no behavior change
  needed since it forces nothing; leave as-is unless a type tweak is required).
- `components/PodcastsBlock.tsx` (new, `'use client'`): mirror MusicBlock's UX. Ask
  bar (default value `find the Lex Fridman podcast`) + mic. POST `/api/lar` with
  `{ transcript, forceDomain: 'podcast' }`. Render a glass result card: artwork,
  title, author, an **Open in Apple Podcasts →** primary button (`applePodcastsUrl`),
  a **Copy RSS feed** action when `feedUrl` exists, and a "Find on" row of chips
  (Spotify, YouTube) from `links`. Bright-line note: "Lar routes you out — it never
  streams audio." Reuse existing globals.css classes; add minimal CSS only if needed.
- `components/Dashboard.tsx`: add a `podcasts` tab (label "Podcasts", glyph e.g.
  `🎙`) between Music and Wealth; render `<PodcastsBlock />` when active.

**Acceptance:** `npx next build` clean; browser-verify (Chrome MCP) that the
Podcasts tab resolves a real show and shows the Apple Podcasts link + RSS + find-on
chips. `npm run typecheck` + prettier clean.
