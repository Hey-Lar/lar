# HANDOFF — read this FIRST in any new Lar chat

Single source of continuity for **Lar** (heylar.ai). A fresh session reads this
and resumes with zero loss. Kept current as work proceeds.

> **Lar** = the guardian of your home. A neutral, voice-driven control surface
> that routes you _outward_ to the best place for each thing. Read `README.md`,
> `docs/01-master-spec.md`, `docs/02-music-architecture.md`, and
> `docs/09-differentiation.md` for the why; `CLAUDE.md` for the rules.

> **Lumina note:** the personal-OS work formerly called "Lumina OS" (repo
> `D:\Claude\life-os`) is **Lar's money/dashboard pillar, already half-built**.
> We are NOT rebranding that repo in place — we stood up this clean Lar repo and
> **harvest** Lumina's proven pieces. See `docs/10-lumina-integration.md`.

---

## Current state (update every increment)

**Repo:** `C:\Users\Amari\Desktop\HeyLar.ai\Lar` — git initialized (local only;
no GitHub remote yet — creating one is a one-time account step, see below).
Node 24 + npm. **pnpm is the canonical package manager** per the spec, but this
machine blocked a global pnpm install (no admin write to `Program Files`), so we
use **npm workspaces + Turborepo** for now — identical topology; switching to
pnpm later = add `pnpm-workspace.yaml` + `pnpm import`.

**Built + green (Phase 1 keyless core):**

- `packages/shared` — the **LarAction** structured-action contract (zod) every
  surface speaks. 5 tests.
- `packages/connectors/music` — the **Music wedge, keyless + live-proven**:
  deterministic intent parser → iTunes search → Odesli cross-platform → platform
  pick (explicit wins, else user priority ∩ availability) → deep link. 12 tests
  - a live smoke (`LAR_LIVE=1`) confirmed end-to-end (text → Odesli → Tidal
    deep link, ~1.3s). Bright-line honored: links only, never audio.
- `packages/connectors/finance` — **read-only** snapshot client that **consumes
  Lumina's `/snapshot`** (`normalizeSnapshot` + `fetchFinanceSnapshot`). 6 tests.
  GET only, no write path; isolated for a future AISP swap + repo split.
- `packages/connectors/podcasts` — **Lar's second media block (keyless)**: iTunes
  podcast search → resolve a show → outward links (Apple Podcasts direct + the
  RSS feed + Spotify/YouTube "find on" search). 6 tests + gated live. Bright-line:
  links only. Built via subagent-driven development (per-task spec + quality
  review) and merged from `feat/podcasts-block` — see
  `docs/plans/2026-06-05-podcasts-block.md`.
- `packages/connectors/books` — **Lar's third media block (keyless)** (merged
  `02d8411`): Open Library search → resolve a book → route **OUTWARD**, with a
  **library-first** lead (WorldCat "find it in a library" — the anti-lock-in
  standout) plus Open Library, Apple Books, Kindle, Kobo, Google Books.
  `searchBook` (keyless OL `/search.json`) + pure, total `buildBookLinks`
  (`Record<BookLink,string>`, ISBN-aware `/dp/` + `vid=ISBN`, defensively
  encoded) + `resolveBook`. 11 vitest specs + 1 live-gated. Portal: `/api/lar`
  `forceDomain:'book'` branch; `BooksBlock.tsx` (library-led CTA + store chips,
  AbortController leak-safety); **Books tab** added. Bright-line held: Lar
  never hosts, streams, or sells — read-only, library-first, your choice.
- `packages/ui` — Lar design tokens (amber "hearth" + glass) + a Tailwind
  preset; descends from the Lumina "ember" theme.
- `apps/portal` — **Next.js 15 glass dashboard, BUILT + browser-verified**.
  Left rail (Home/Music/Wealth/Health), "Liquid-Glass-but-ours" warm mesh.
  **Music + Podcasts blocks fully wired + live**: type/say a request → `POST
/api/lar` (deterministic parse, `kind` discriminator + `forceDomain`) →
  `resolveMusic` (cover, "Routing to <platform>", "Open in <platform> →",
  cross-platform "Available on" row) or `resolvePodcast` (show art, "Open in
  Apple Podcasts →", "Copy RSS feed", "Find on" Spotify/YouTube). Mic via Web
  Speech API (falls back to text). App opens on a rich **Overview** landing
  (greeting + live clock + net-worth glance + quick-launch cards). **Wealth =
  full net-worth dashboard** (gradient hero, SVG sparkline + trailing delta,
  segmented allocation bar + bucket cards, goals, color-coded signals, demo/
  your-data badge) — `connector-finance` now ships `demoSnapshot()` so it's
  rich with no API; `/api/finance` returns real data when `LUMINA_API_BASE` is
  set. `next build` clean; all blocks screenshot-verified on :4200.
- **71 unit tests green (+2 gated live); typecheck + prettier clean
  (`endOfLine: auto` to kill Windows CRLF churn); `next build` clean
  for both apps.** Coverage gained this session: `@lar/ui` 8 themes
  specs (D1), `apps/portal/lib/synthetic-ohlc` 9 (D4),
  `apps/portal/lib/agenda-demo` 8 (D5), `apps/portal/lib/authz` 6
  (Phase 3), `@lar/crypto` +3 iter-clamp (16 total). The portal +
  marketing workspaces both have `test` scripts.
  `docs/09-differentiation.md`, `docs/10-lumina-integration.md`,
  `docs/11-secrets-and-env.md`, `docs/12-deploy.md`, and
  `docs/plans/2026-06-05-podcasts-block.md` written.
- **Security/governance layer (branch `feat/v2-security-foundation`):**
  `SECURITY.md` (threat model, vuln reporting, incident rule) ·
  `docs/11-secrets-and-env.md` (env contract, server-only boundary, rotation) ·
  `apps/portal/.env.example` (placeholder-only) · `docs/03-governance.md`
  updated (Security row implemented, four security bright-lines, dep-risk stub) ·
  `CLAUDE.md` + `HANDOFF.md` restated to match.
- **Known minor follow-ups CLEARED** (`56ecaa4` + `533b700`):
  `@lar/crypto.decryptSecret` now clamps `iter` (DoS hardening);
  Music + Podcasts ask-bars hold an `AbortController` and abort
  prior + on-unmount; PodcastsBlock's Copy-RSS reset-timer is
  tracked + cleared on unmount. Remaining minor: the portal blocks
  still inline-duplicate their resolution types (DRY-only, no
  functional impact).

## V2 program — Phases 0–3 ✅ COMPLETE (reference / history)

> **What's actually next is in the "Current state" section above** — the
> _post-V2 keyless feature increments_ block (its **NEXT (suggested), pick one**
> bullet). V2 Phases 0–3 below are all done (local prep); the only V2 remainder
> is the **account-gated** list above. This section is kept for context.

**V2 program** (full plan: `docs/plans/2026-06-05-v2-security-merge.md`, from a
5-agent research synthesis). **Phase 0 — security foundation: ✅ MERGED**
(`@lar/crypto` encryption vault · gitleaks pre-commit + fail-closed CI secret
gate · hardened `.gitignore` · `SECURITY.md` + `docs/11` env conventions ·
governance bright-lines). **History, in order:**

- **Phase 1 — harvest the read-only finance core from `D:\Claude\invest-bot-personal`**
  (founder's own repo — direct harvest OK; tracked files only, never its `data/`).
  **Pure core ✅ MERGED** (`99bd84f`): **B1** `@lar/shared` Intl format helpers ·
  **B2** read-only `BrokerAdapter`/`DataAdapter` contracts (every write/order method
  omitted — structural read-only guarantee) · **B4** `connectors/finance/analytics`
  (FIRE Monte-Carlo w/ seeded RNG, rebalance drift, contribution-rebalance that
  NEVER sells, dashboard math — source tests ported verbatim). All read-only /
  pure / keyless verified. **Infra + gate ✅ MERGED** (`fcad759`): **B3**
  `connectors/finance/adapters` (typed errors, `SerialQueue` rate-limiter,
  read-only `RecordingAdapter` replaying in-memory fixtures — no write methods)
  · **B6** `@lar/safety` transport-agnostic **fail-closed gate** (kill-switch +
  read-only [any truthy mutating blocked] + stale-guard fail-closed + secret-
  dropping audit log). **B5 ✅ MERGED** (`d24ec3b`): `services/mcp` (`@lar/mcp`)
  — read-only MCP service, 5 tool groups (account/positions/quotes/symbols/
  health), NO order/write tool (registration-time `WRITE_PATTERN` guard), every
  call gated fail-closed via `@lar/safety` BEFORE the adapter + audit-logged,
  `demoDeps()` keyless default (B3 RecordingAdapter), stdio (MCP SDK 1.29).
  **→ PHASE 1 COMPLETE.** Packages now: `shared · crypto · safety · ui ·
connectors/{finance,music,podcasts}` + `services/mcp`.

- **Phase 2 — Dashboard V2 (in progress):** make the harvested finance core
  VISIBLE. **Markets block ✅ MERGED** (`7fbaa0f`): a read-only **Markets** tab +
  `/api/markets` (GET) surfacing **D2/D3/B7/B8** at once — a **FIRE Monte-Carlo
  projection** panel (P50 hero + P10–P90 band + probability-of-success via
  `classifySuccessBand`, tuned to a healthy ~81% "Good"; display-only, "not
  advice"), a **holdings table** with `computeDrift`/`classifyDrift` chips, and
  an allocation bar — KEYLESS demo, no buy/sell controls, browser-verified.
  **D6 connector-token vault UI ✅ MERGED** (`8c6c48b`): a **Connect** tab where
  a user pastes a READ-ONLY key → encrypted **client-side via `@lar/crypto`**
  (PBKDF2-600k → AES-256-GCM) → stored ciphertext-only in localStorage
  (`createVaultStore`). Plaintext key + passphrase never leave the browser
  (decrypted key kept in a ref, char-count only, auto-clears 120s + on unmount);
  Unlock/Forget + stored-keys list. Opus security review: all 4 bright-lines
  confirmed; **browser-verified live** — localStorage holds only `{kdf,iter,
salt,iv,ct}`, no plaintext key/passphrase. The visible proof of the Phase-0
  encryption pillar.
  **D1 tri-theme toggle ✅ MERGED** (`72ccb01`): `@lar/ui` now ships **three**
  palettes — **dark "Synex"** (near-black body + indigo/amber dark blobs),
  **ember "Atrium"** (warm peach mesh — the default), **light "Stone"** (cool
  violet/teal mesh). The amber **hearth** accent is the brand and stays
  identical across themes; what flips is body / glass fills / ink contrast /
  mesh stops / rail surfaces. `themeCss()` emits one `[data-theme]` block per
  theme into a `<style>` injected in `<head>`; a pre-hydration `<script>`
  reads `localStorage["lar-theme"]` and sets `data-theme` on `<html>` before
  first paint (no FOUC). A small rail button (above the avatar) cycles
  dark→ember→light and persists; cross-tab sync via `storage` events. 8
  vitest specs in `@lar/ui` (palette completeness, themeCss coverage, cycle
  order, coerce fallback, dark-mode contrast). **Browser-verified live** at
  :4200 via Chrome MCP — all three render distinctly, brand accents preserved.
  **D4 hero candlestick + watchlist ✅ MERGED** (`46c6268`): the top of the
  Markets tab now opens with a **TradingView Lightweight Charts** hero
  (Apache-2.0, dynamic-imported so it stays out of the eager bundle) +
  volume histogram + last-price hearth line, and a **sortable watchlist**
  of the demo holdings with last / Day Δ / Day % / 30-day SVG sparkline.
  Click any row to swap the hero symbol. Every price is generated by a
  pure, KEYLESS, deterministic OHLCV walk (xmur3 + mulberry32 PRNG, seeded
  `walk:<symbol>`, geometric drift + vol clustering, 180 daily bars, UTC-
  midnight snap so SSR + CSR agree). The chart reads Lar CSS vars at mount
  AND re-applies them via a `MutationObserver` on `<html data-theme>`, so
  cycling D1's theme also re-colors the live chart. 9 new vitest specs on
  `apps/portal/lib/synthetic-ohlc` (OHLC invariant, per-symbol uniqueness,
  same-UTC-day stability, length edge-cases). BRIGHT-LINE held: synthetic
  data only, "not advice", "Lar never trades" labels on hero + watchlist.
  **Browser-verified live** in all three themes (ember teal/red on warm
  glass, dark on Synex black, light on Stone) and click-to-select round-
  tripped (VWCE → IWDA, hero swapped to €92.12 / −19.78 / −17.68%).
  **D5 agenda block ✅ MERGED** (`c30b2f2`): an eighth portal tab + an
  Overview "up next · agenda" preview card. `apps/portal/lib/agenda-demo`
  is a pure, KEYLESS generator — 7 daily slots tagged Calendar / Focus /
  Wealth / Health, anchored to local midnight via `generateAgenda(asOfMs)`;
  `currentItem` / `nextUpcoming` select the running or up-next slot (8
  vitest specs cover sortedness, end > start, source whitelist, intraday
  stability, nextUpcoming wraparound, currentItem mid-block + gap).
  `/api/agenda` is GET-only (no write path). `AgendaBlock.tsx` paints a
  themed "Now / Up next" hero card + a today-list where past items dim
  to 0.45 opacity and the running item paints its time in hearth amber;
  source chips use the brand palette (Calendar amber, Focus teal, Health
  red, Wealth blue). BRIGHT-LINE held: read-only / routes-outward — Lar
  never creates, edits, or deletes events. **Browser-verified live** in
  light + dark themes (after-hours screenshot caught the "All clear · the
  day is done" hero state). Portal tabs now: **Overview · Agenda · Music ·
  Podcasts · Wealth · Markets · Health · Connect** (8). **→ PHASE 2
  DASHBOARD V2 COMPLETE.**
  **Phase 3 deploy hardening (local prep) ✅ MERGED.** Three pieces, all
  ready to go live the moment GitHub + Vercel are wired:
  - **Per-handler authz seam** (`7dc8cf0`): `apps/portal/lib/authz.ts`
    `authorize(req, { policy, allow })` runs at the top of every `/api/*`
    handler. Defends against the March-2025 `x-middleware-subrequest`
    CVE shape (CVSS 9.1) by NOT relying on middleware alone. Default
    policy is `personal` (single-user read-only) with a method allow-list
    (`/api/{finance,markets,agenda}` are GET-only, `/api/lar` is POST-only).
    `LAR_KILL_SWITCH=1` returns 503 + `X-Lar-Kill-Switch: 1` on every
    route. Future `session` / `token` / `origin` policies are wired as
    fail-closed stubs. 6 vitest specs.
  - **Nonce-CSP edge middleware** (`dab41a5`): `apps/portal/middleware.ts`
    generates a base64 nonce per request, attaches it via `x-nonce` to
    the request and to the response's CSP, and ships Nosecone-equivalent
    security headers (HSTS 2y preload, X-Frame-Options DENY, COOP/CORP
    same-origin, Referrer-Policy no-referrer, Permissions-Policy with
    only `microphone=(self)` for the Web Speech API). `layout.tsx` reads
    the nonce and stamps it on the two inline tags Lar ships (themeCss
    `<style>`, theme-boot `<script>`). Live-verified: HEAD on `/`
    returns the full header set, 1 nonce-stamped `<style>` + 13 nonce-
    stamped `<script>` tags, no CSP violations.
  - **Deploy runbook** (`a4158a6`): `docs/12-deploy.md` covers pre-deploy
    local gates, the one-time account actions (GitHub `gh repo create`,
    Vercel link + env vars), env-var contract, deploy flow, manual smoke,
    and the revoke-before-scrub rollback rule.

  **Known follow-ups ALL CLEARED in the same window:**
  - **`@lar/crypto` iter clamp** (`56ecaa4`): `decryptSecret` now rejects
    any record whose `iter` is non-finite, < 1, or above the new
    `PBKDF2_ITERATIONS_MAX = 5,000,000` ceiling. Defends against a
    local-only DoS where a tampered localStorage record asks for 10^9
    iterations. 3 new vitest specs, crypto now at 16 total.
  - **AbortController + setTimeout leak** (`533b700`): both Music and
    Podcasts ask-bars now hold an `inflightRef<AbortController>`. New
    submissions abort prior ones, the unmount-effect aborts whatever's
    open. PodcastsBlock's Copy-RSS "Copied ✓" reset-timer is now
    tracked in a `copyResetRef` and cleared on unmount + cancelled when
    a rapid second copy lands.
  - **`apps/marketing` keyless landing** (`51349d9`): new workspace at
    `:4201`. Hero "One warm surface for everything you control" (amber
    gradient on "warm"), live-cycling "Available on" cross-platform
    demo with aria-live narration explaining the routing choice, three
    pitch cards on the bright-lines (read-only / your-algorithm / your-
    data), brand-warm mesh + glass from `@lar/ui`. 969 B page, 103 kB
    First Load JS. Email waitlist still gated on Supabase.

  **→ PHASE 3 DEPLOY HARDENING COMPLETE (local prep).**

  **A11y / keyboard pass ✅ MERGED** (`b8168e6`): `*:focus-visible` ring
  in hearth amber (2 px outline + soft `--hearth-glow` halo) on
  `apps/portal/app/globals.css` — works across all three themes because
  `--hearth` is in `@lar/ui`'s shared-accent block. Pointer users get
  no ring (`*:focus { outline: none }`); keyboard users get the
  contract. Rail nav buttons gain `aria-label="Open <Label> tab"` so
  screen readers announce destinations, not glyphs. WatchlistBlock
  gains `<table role="grid">` + per-row `role="row"` +
  `aria-label="<SYM> — <name>, last <last>, day up/down <pct>%"` so
  the synthetic-data series is fully spoken.

  **The V2 plan (Phases 0–3) is done; what's left in V2 is account-gated.**
  Autonomous work now continues as **post-V2 keyless feature increments** that
  extend the product along the route-outward thesis (each = subagent-driven,
  spec+quality reviewed, merged `--no-ff` green, HANDOFF kept current):
  - **Books block ✅ MERGED (`02d8411`)** — see the connector bullet above.
  - **Health dashboard ✅ MERGED (`8049b28`)** — promoted the inline shell to a
    real **keyless local-first** dashboard. `apps/portal/lib/health-demo.ts`
    `generateHealth(asOfMs)` = pure deterministic generator (per-day
    xmur3+mulberry32 seed → stable across the day so SSR/CSR agree, differs day
    to day; mirrors `agenda-demo`/`synthetic-ohlc`): move/exercise/stand rings
    (pct clamped 0..100), steps, sleepHours, restingHr, 7-day move% trend
    (`trend[6]` === today's move pct). 19 vitest specs. `HealthBlock.tsx` =
    rings + steps/sleep/HR tiles + Sparkline trend + local-first note. Read-only
    — Lar never writes/syncs/sells health data. Build+test+review verified.
  - **Film & TV "where to watch" block ✅ MERGED (`ba7366f`)** — fourth media
    pillar, same route-outward shape, KEYLESS. `@lar/connector-filmtv`:
    `searchTitle` (Wikipedia REST — keyless card art + description) + pure total
    `buildWatchLinks` (`Record<WatchLink,string>`, encodeURIComponent-safe) +
    `resolveFilm`. Routes OUTWARD JustWatch-led ("where can I watch this" neutral
    aggregator — the standout, like WorldCat) + Netflix / Prime / Disney+ / Apple
    TV / YouTube / Letterboxd. 16 vitest specs + 1 live-gated. `/api/lar`
    `forceDomain:'film'` branch; `FilmBlock.tsx` (JustWatch-led CTA + chips +
    Wikipedia link). Bright-line: never hosts/streams — links only.
  - **🔴 CRITICAL FIX — CSP nonce / theming (`c38cb71`)** — the Phase-3 nonce-CSP
    middleware set `x-nonce` on the request + CSP on the **response only**.
    Next.js derives the nonce for its OWN framework `<script>` tags from the
    **request-side** `Content-Security-Policy` header; absent that, Next minted a
    different nonce than the one `layout.tsx` stamps on the inline themeCss
    `<style>` + theme-boot `<script>`. The response CSP whitelisted only one, so
    the browser **blocked the themeCss `<style>` (`style.sheet === null`)** →
    every theme variable resolved empty → ALL accent CTAs, glass + mesh vanished
    app-wide (page fell back to black-on-white). Fix: also set the CSP on the
    **request** headers (the documented Next.js nonce contract) in
    `middleware.ts`. **This passed build + test + code-review and only surfaced
    under live browser verification — UI changes MUST be browser-checked.**
  - **All 10 tabs browser-verified ✅** (Chrome MCP, ember theme): theme vars
    resolve (`--hearth #d98a2b`, `--body #eef1f6`), warm mesh + glass render,
    Books resolves live (Open Library → "Borrow from a library →" amber CTA),
    Film resolves live (Wikipedia + "Where to watch →"), Health rings/tiles/
    sparkline render (Move/Exercise/Stand 73/100/83%, steps, sleep 7h18m, HR 67).
  - **Media-block polish ✅ MERGED (`a051d63`)** — Music/Podcasts/Books/Film
    `.cover` `<img>` now hides itself `onError` (no broken-image box on a 404
    cover/artwork/thumbnail); Film default query `Dune` → `Dune movie` (Wikipedia
    card resolves the film, not the sand-dune article).
  - **Weather block ✅ MERGED (`250a5d1`)** — Lar's first block with REAL live
    data that's still fully KEYLESS, via **Open-Meteo** (no key/token). Server-
    side geocode (city → lat/lon) + forecast, mapped through a pure WMO-code →
    label+icon table. `@lar/connector-weather`: `geocode` + `fetchForecast` +
    `resolveWeather` → `WeatherSnapshot` (current + 5-day, temps rounded,
    `noUncheckedIndexedAccess` on the parallel daily arrays). 14 vitest specs +
    1 live-gated. `/api/weather` GET route (`authorize()`-gated, GET-only → POST
    405); **Open-Meteo is fetched SERVER-SIDE** so the browser only hits same-
    origin and the CSP `connect-src` list is unchanged; `WeatherBlock.tsx` (city
    input + current hero + 5-day forecast, AbortController leak-safety); Weather
    tab after Agenda. **Browser-verified live** (Lisbon 16°C "Mainly clear", 87%
    humidity, 12 km/h, 5-day 26/24/24/27/32°). Bright-line: keyless, read-only,
    no location stored, no client→third-party fetch.
  - **Places block ✅ MERGED (`12b2b1c`)** — fifth route-outward pillar, KEYLESS
    via **OpenStreetMap Nominatim** (server-side, descriptive User-Agent). Added
    a `'place'` domain + `'location'` entity to `@lar/shared` (exhaustive
    `ENTITY_FOR_DOMAIN` updated in connector-music). `@lar/connector-places`:
    `searchPlace` (fail-loud on non-finite coords) + pure total `buildMapLinks`
    (lat/lon-encoded) + `resolvePlace`. 13 vitest specs + 1 live-gated. `/api/lar`
    `forceDomain:'place'` branch (server-side fetch → CSP unchanged);
    `PlacesBlock.tsx` (OSM-led "Open in OpenStreetMap →" + Directions/Google/
    Apple/Waze chips). **Browser-verified live** (Time Out Market Lisboa →
    address + OSM link + 4 map chips). Bright-line: links only — never embeds a
    map tile service, uses geolocation, or stores location.
  - _Tabs now (13):_ Overview · Agenda · **Weather** · **Places** · Music ·
    Podcasts · **Books** · **Dictionary** · **Film & TV** · Wealth · Markets ·
    **Health** · Connect.
  - **Overview surfacing ✅ MERGED (`110b263` + `987cda7`)** — the landing
    quick-launch grid now surfaces all of Weather/Places/Books/Film alongside
    Music/Podcasts/Health (was just Music/Podcasts/Health). Browser-verified
    themed.
  - **CSP regression guard ✅ MERGED (`3dceeae`)** — `apps/portal/middleware.test.ts`
    (5 specs). The key spec asserts the **request-side** CSP carries the same
    nonce as the response CSP (fails closed if the `c38cb71` fix is ever undone),
    plus the hardening-header set, fresh-nonce-per-request, and kill-switch
    header. Portal vitest now 47 specs (5 files). **This guards the most
    important fix of the session** — the one that build/test/review all missed.
  - **DRY refactor ✅ MERGED (`efc81f3`)** — extracted the duplicated ask-bar +
    mic + AbortController + `run()` logic (and the inline Resolution/
    SpeechRecognition types) from all 5 route-outward blocks into a generic
    **`apps/portal/lib/useAskLar.ts`** hook + **`apps/portal/components/AskBar.tsx`**.
    Each block keeps its unique card verbatim and imports its Resolution type
    from its connector. **Net −300 lines.** Behavior byte-for-byte preserved —
    a review caught two divergences (the right-kind-no-resolution message must be
    "Nothing to route.", and PodcastsBlock's copy-timer needs its own unmount
    cleanup) and both were fixed (`a744de4`). **Browser-verified live**: Music
    resolves (Calm → Routing to Tidal) + Podcasts resolves + "Copied ✓" works.
    A new block now = `useAskLar<XResolution>({kind,forceDomain,initial})` +
    `<AskBar/>` + the card. (Also cleaned up ~10 stale already-merged branches;
    only `master` remains.)
  - **Dictionary block ✅ MERGED (`bf3c02b`)** — FIRST block built on the new
    `useAskLar`/`AskBar` shell (proof the refactor pays off). KEYLESS via
    `dictionaryapi.dev` (Wiktionary open data, server-side). Added a `'define'`
    domain + `'word'` entity to `@lar/shared`. `@lar/connector-dictionary`:
    `lookupWord` (404 → fail-loud before any array access) + pure `buildWordLinks`
    - `resolveWord`. 11 vitest specs + 1 live-gated. `DictionaryBlock.tsx` (word +
      IPA phonetic + 🔊 audio link + senses [partOfSpeech + definitions] + Wiktionary-
      led CTA + Merriam-Webster/Google chips). **Browser-verified live** (serendipity
      → IPA + 2 noun senses + Wiktionary). Bright-line: keyless, read-only, never
      stores queries.
  - **Parser detects all 6 domains ✅ MERGED (`f013d99`)** — the deterministic
    intent parser (`connector-music/src/intent.ts`) now recognises **place** +
    **define** and broadens film/book (was podcast/film/book → music-default),
    and strips the new domain trigger words from `entity.query` so connectors get
    a clean entity (e.g. "define serendipity" → domain `define`, query
    `serendipity`). ZERO risk to existing blocks (they send `forceDomain`, which
    overrides detection); this only powers the no-`forceDomain` path. Music wedge
    unchanged (10 original specs green); +8 detection specs (music now 25+1 live).
  - **🌟 Global "Hey Lar" router bar ✅ MERGED (`be9038b`) — THE THESIS, REALIZED.**
    `apps/portal/components/GlobalAsk.tsx` sits at the top of the Overview: ask
    ANYTHING → POST `/api/lar` with **no** forceDomain → the parser picks the
    domain → the bar shows the resolved primary outward link + "Open <Tab> →".
    Kind-agnostic run (AbortController leak-safety) + a typed
    `summarise(kind,resolution)` → {label,tab,title,openLabel,openUrl} for all 6
    domains; **weather** is special-cased client-side (→ navigate to Weather).
    **Browser-verified live**: "define serendipity" → Dictionary/Wiktionary,
    "where can I watch Dune" → Film & TV/JustWatch. 6 no-forceDomain kinds
    curl-verified. This is the "say what you want, Lar routes you outward" promise
    working end-to-end, keyless.

  ### 🎨 DESIGN OVERHAUL (DESIGN.md-driven — user direction, ITERATING)

  A from-research design pass. Guidelines in **`docs/DESIGN.md`** (authored from a
  4-stream research sweep: glassmorphism · iconography · motion · ambient
  backgrounds). **We iterate on DESIGN.md + redesign elements toward perfection.**
  HARD RULE captured: **NEVER use emojis** — everything is the `@lar/ui` `<Icon>`.
  - **Custom `<Icon>` system ✅ MERGED (`91911e6`)** — `@lar/ui` ships
    `packages/ui/src/icons/{Icon.tsx,registry.ts}` (24×24, 1.75 stroke,
    `currentColor`, a11y). 43 glyphs adapted from Lucide (ISC — notice in
    `packages/ui/LICENSES.md`). **Every emoji replaced** app-wide (rail + brand
    hearth-flame mark, tiles, ask-bar mic, weather `wx-*`, arrows, theme toggle,
    vault, marketing). `wmo.ts` returns semantic `wx-*` names. Browser-verified.
  - **Liquid-glass pass ✅ MERGED (`6083935`)** — elevation token scale in
    `themes.ts` (`--glass-strong/-tint/-stroke/-highlight/-scrim`, `--shadow-1/2/3`;
    `--elev-1/2/3`). `.glass` recipe = specular highlight + hairline + layered
    float shadow + `.glass--clear/--frost` + `prefers-reduced-transparency`.
    Depth: rail+ask-bar+tiles frosted & FLOAT (hover-lift); stage clear so the
    scene reads through. Browser-verified: dark theme = true translucent panes.
  - **Ambient scene backgrounds ✅ MERGED (`20f8af8`)** — replaced the flat warm
    mesh with 6 privacy-safe CSS/SVG scenes (`calm·hearth·dawn-skyline·deep-night·
aurora·warm-mesh`) via `SceneBackground.tsx` + `[data-scene]` CSS + the
    `appearance.ts` model + pre-paint boot. **`DEFAULT_THEME` → `dark`, default
    scene `hearth`** (dark hearth-room is the new default — FIXES the "orange
    glowing cursor": the harsh top-left orange blob is gone, replaced by a subtle
    warm fire-glow bottom-center). Browser-verified gorgeous.
  - **Fluid motion ✅ MERGED (`3d4fddf`)** — CSS-only (0 deps, reuses `--ease`):
    keyed `stage-anim` remount → tab cross-enter; `--i`-staggered Overview tiles;
    `result-in` for the Hey Lar card; `prefers-reduced-motion` fade-only.
  - **Appearance settings drawer ✅ MERGED (`<this>`)** — rail settings button →
    glass drawer: theme swatches · 6-scene picker · scene-intensity + frost(glass-
    blur) sliders · motion toggle. Live + persisted (`lar-appearance`; theme→
    `lar-theme`); the frost slider scales `--glass-blur` through the elevations.
    Browser-verified: opens, scene-swap/sliders apply live.
  - **Design polish 1 ✅ MERGED (`c6c4bbc`)** — the `hearth` scene now has a real
    **"designed room" silhouette** (centered fireplace/mantel with the warm glow
    in its arched opening + armchair + floor lamp + potted plant + floor line;
    subtle `--sil-*` layers, legible behind glass — browser-verified cozy on a
    sparse tab); scene-picker thumbnails are distinct per-scene previews; the
    **aurora** scene rebalanced cool (teal+indigo dominant, warm a small accent);
    the hero **weather** icon is hearth-amber with muted forecast icons.
  - **Touch + light + glass ✅ MERGED (`9919094`)** — user direction (more
    transparency, light-themed, touchscreen sizing). **`DEFAULT_THEME` → `ember`**
    (warm light). Light-theme glass fills dropped hard (ember `--glass` .55→.34,
    `--glass-strong` .70→.50; light .32/.48) so tiles read as **clear glass with
    the room showing through**; legibility held via behind-text `--glass-scrim`
    pseudo on cards + `--num-shadow`; brighter `--body`; default frost 20→23.
    **Touchscreen sizing** throughout: rail 104→124px, navbtn →88×72 (≥48px) w/
    bigger icons+labels, tiles +padding & bigger titles/lead, ask input →62px,
    mic/Ask →62, chips ≥44px, `.open` ≥48px. Browser-verified warm/airy/glassy.
  - **3D living-room scene ✅ MERGED (`f7d1502`)** — user direction (realistic 3D
    living room). New **`living-room`** scene (now DEFAULT) in inline SVG/CSS
    (privacy-safe, no fetch): daylight window (light source) + perspective floor +
    rug + volume-shaded 3-seat sofa + coffee table + muted-sage plant + floor lamp
    - framed art + soft shadows + center-calm vignette. Per-theme `--room-*`
      tokens (ember/light sunlit, dark cozy-dim); scene-scrim dialled light so the
      room reads through the clear tiles. **Honest note:** it's a _stylized_ room
      (SVG can't be photoreal). **Optional photoreal path wired:** drop an AI image
      at `apps/portal/public/local/living-room.jpg` (git-ignored; README there) →
      `.scene-photo` makes it the real background, SVG room as fallback. Browser-
      verified on ember (sofa/lamp/floor/window read, warm).
  - _Design polish backlog (still open):_ the stylized room reads **soft/washed-
    out** behind the very-clear tiles — sharpen furniture contrast or (better) use
    the photo layer; scene thumbnails could be more vivid; the dev **cold-start
    theme/click race** (single cold `next dev` navigate can render unstyled/miss a
    click — a **double-navigate** or reload fixes it; prod/`next start`
    unaffected). **Platform:** touch-PWA now; **React Native + Expo** is the
    recommended next surface (reuses all `@lar/*` pure-TS packages; only UI is
    rebuilt) when ready for device-native (Keystore, gestures, Android roadmap).

  - **NEXT (suggested), pick one:** 0. **Enrich the global bar:** show richer inline results (cover art / chips,
    not just the primary link), wire its mic, route low-confidence parses to
    the Claude API (`LAR_ANTHROPIC_KEY` gate) for fuzzy intent, and let the
    target tab open pre-filled with the query (lift resolution state or pass an
    initial-query prop).
    1. **Another keyless block** (additive, lowest-risk, now ~1 connector + a thin
       block): **News/Reading** route-outward (topic → neutral sources), a
       **Translate** block (MyMemory API is keyless), or **Sports/Transit**.
    2. **Depth over breadth:** wire a real Lumina API (`LUMINA_API_BASE`) so the
       Wealth block shows live net worth (proves the finance harvest E2E), or
       enrich Markets/Wealth analytics.
    3. **`@lar/connector-*` Resolution-card DRY** — the `.np`/`.avail`/`.chip`
       card shells still repeat across blocks; a `<ResolveCard>` could take
       primary-CTA + chips as props (only do if a clean abstraction emerges —
       the cards genuinely differ, so don't force it).
  - _Review-nit backlog ✅ ALL CLEARED (`0063981`):_ health-demo "different-day"
    test now asserts a real metric differs; `HealthBlock` SSR-anchor TZ-footgun
    comment added; Weather — split `openmeteo.js` import merged, `geocode` throws
    on missing coords (no silent 0,0 fallback), new truncated-daily-array test
    proves `resolveWeather` degrades safely.

  **⚠️ DEV-ONLY runtime notes (not bugs — for the next session's awareness):**
  - **CSP theme on cold dev start:** the FIRST request after `next dev` starts
    cold (esp. right after a `next build` left prod artifacts in `.next`) can
    render UNSTYLED (theme `<style>` momentarily `sheet === null`) because the
    middleware nonce handshake races the on-demand compile. **A hard reload
    fixes it** and it never happens under `next start` (prod, precompiled
    middleware). Verify with the JS probe: `getComputedStyle(document
.documentElement).getPropertyValue('--hearth')` should be `#d98a2b`.
  - **Benign hydration warning:** dev shows "1 Issue" — a nonce hydration
    mismatch (`nonce="…"` server → `""` client, because browsers strip the
    nonce _attribute_ after use; the `.nonce` _property_ is intact) plus a
    browser-extension-injected `data-fbscriptallow` on `<html>`. Both are
    external/expected; the theme + app work. Do not "fix" by removing the CSP
    nonce.

  **Everything in V2 that does not need an account is done.** What remains in
  V2 is account-gated:

  **Account actions pending** (the agent will not run these — see the
  Credential gates table for context):
  1. **`gh repo create lar --private --source . --push`** then wire the
     GitHub→Vercel deploy hook. After this, every push to `master`
     triggers CI (typecheck / test / lint / gitleaks) → Vercel deploy.
  2. **Vercel project link** for `apps/portal` (`:4200`) and
     `apps/marketing` (`:4201`) + env vars per `docs/11` and `docs/12`.
  3. **Supabase project** — unlocks the email waitlist on the marketing
     landing + sign-in / RLS on the portal.
  4. **Anthropic / market-data / Trigger.dev keys** per the Credential
     gates table — unlock cloud intent escalation, live market data,
     and scheduled refreshes.
  - _Follow-up (minor crypto hardening):_ clamp `iter` in `@lar/crypto`
    `decryptSecret` to a sane max so a tampered localStorage record can't request
    an absurd PBKDF2 count (local-only DoS; attacker already needs storage write).

- **Phase 3 — deploy:** Vercel (Nosecone headers + nonce CSP + per-handler authz)
  then Android (Tink + Keystore). Adopt only the **permissive-licensed** external
  libs in the plan's Section C (gitleaks/age/dotenvx/Nosecone/T212-api/SnapTrade/
  Tink); copyleft (trufflehog/SOPS/Ghostfolio) is **external-CLI/reference only**.

Other available tracks (independent of V2):

1. **`apps/marketing` — the "wow" landing** (`docs/08` §8): the hearth story,
   a live "Available on" cross-platform demo, glass in motion, anti-lock-in
   pitch, email waitlist. The design centerpiece; keyless except the waitlist
   store (which needs Supabase — gate).
2. **Wire real money:** run the Lumina API and set `LUMINA_API_BASE` so the
   Wealth block shows live net worth (proves the harvest end-to-end). Then
   absorb `quiet-margin`'s richer finance views into `connectors/finance`.
3. **Cloud intent escalation:** in `/api/lar`, when `LAR_ANTHROPIC_KEY` is set
   and the deterministic parse is low-confidence, call the Claude API to emit a
   `LarAction` (validate with `safeParseLarAction`). Keyless path already works.
4. **Supabase auth + RLS** (`services/supabase`): sign-in, `preferences` +
   `play_history` tables, RLS so each user owns their data → feed
   `platformPriority` into `/api/lar` from the user's row.

Run the portal: `cd apps/portal && npx next dev -p 4200` (or `next start` after
`next build`). Verify in browser via Chrome MCP.

## Build / verify / push

- Install: `npm install` (root). Test all: `npm test` (turbo). Typecheck:
  `npm run typecheck`. Lint: `npm run lint` (prettier --check). Format:
  `npm run format`.
- Live music smoke: `cd packages/connectors/music && LAR_LIVE=1 npx vitest run`.
- Commit per increment; keep this file current.

## Credential gates (need YOUR account/keys — like GitHub auth was)

| To finish                                      | Needs                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Sign-in + per-user prefs/history (RLS)         | **Supabase** project (URL + anon/service keys) → `services/supabase` |
| Cloud intent escalation (hard/ambiguous voice) | **Anthropic API key** (`LAR_ANTHROPIC_KEY`, server-only)             |
| Real money in the Wealth block                 | a running **Lumina API** (`LUMINA_API_BASE`) — already exists        |
| Reliable explicit-Spotify routing              | a Spotify-auth seed (Odesli misses Spotify from an Apple seed)       |
| GitHub remote + Vercel CI                      | `gh repo create lar --private` (account action — confirm first)      |

Everything NOT in this table is buildable now (keyless). The Music wedge +
finance-via-Lumina already work without any key.

See `docs/11-secrets-and-env.md` for the full env contract, naming convention,
and rotation guidance. Copy `apps/portal/.env.example` → `.env.local` to start.

## BRIGHT-LINES (never cross — docs/03 + SECURITY.md)

Read-only finance (no money movement) · no financial/medical advice · never
host/stream others' content (controller/router only) · no selling/training on
user data · never depend on Spotify's recommendation endpoints.

**Security bright-lines (implemented — see SECURITY.md + docs/11):**

1. **Refuse to disable the safety gate.** Never `git commit --no-verify` or bypass gitleaks. The gate cannot be talked around.
2. **Never paste a real key or secret into a chat with any LLM.** Transcripts persist.
3. **AGPL/GPL/MPL source: external CLI over stdout/JSON only — never imported or vendored into shipped code.**
4. **Keep CLAUDE.md + HANDOFF.md accurate in the same commit that changes structure.**

**Security infrastructure now in place:** `@lar/crypto` WebCrypto vault · gitleaks pre-commit + CI gate · hardened `.gitignore` · `SECURITY.md` · `docs/11-secrets-and-env.md` · `apps/portal/.env.example`.
