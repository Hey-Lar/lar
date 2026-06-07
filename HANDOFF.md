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

## NEXT increment (do this next)

**V2 program** (full plan: `docs/plans/2026-06-05-v2-security-merge.md`, from a
5-agent research synthesis). **Phase 0 — security foundation: ✅ MERGED**
(`@lar/crypto` encryption vault · gitleaks pre-commit + fail-closed CI secret
gate · hardened `.gitignore` · `SECURITY.md` + `docs/11` env conventions ·
governance bright-lines). **Do next, in order:**

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
  - **NEXT: Health dashboard** — promote the inline `HealthBlock` shell (in
    `Dashboard.tsx`) into a real **keyless demo dashboard** like Wealth:
    activity rings (move/exercise/stand), steps, sleep, resting HR, a 7-day
    trend sparkline, all from a pure deterministic `health-demo` generator
    (mirror `agenda-demo`/`synthetic-ohlc`). Local-first framing: "your data,
    on-device, never sold." Read-only — Lar never writes health data.
  - _Then (candidates):_ Film & TV "where to watch" route-outward block
    (keyless via a demo/title resolver), shared resolution-types DRY refactor.

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
