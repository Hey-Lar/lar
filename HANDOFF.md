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
- **37 unit tests green (+2 gated live); typecheck + prettier clean (`endOfLine:
auto` to kill Windows CRLF churn); `next build` clean.**
  `docs/09-differentiation.md`, `docs/10-lumina-integration.md`, and
  `docs/plans/2026-06-05-podcasts-block.md` written.
- **Security/governance layer (branch `feat/v2-security-foundation`):**
  `SECURITY.md` (threat model, vuln reporting, incident rule) ·
  `docs/11-secrets-and-env.md` (env contract, server-only boundary, rotation) ·
  `apps/portal/.env.example` (placeholder-only) · `docs/03-governance.md`
  updated (Security row implemented, four security bright-lines, dep-risk stub) ·
  `CLAUDE.md` + `HANDOFF.md` restated to match.
- **Known minor follow-ups** (non-blocking, flagged in final review): the portal
  blocks inline-duplicate their resolution types + carry a couple of dead `??`
  fallbacks (matches the MusicBlock pattern); `PodcastsBlock`'s Copy-RSS
  `setTimeout` isn't cleared on unmount; neither ask-bar guards against
  overlapping in-flight requests (an `AbortController` would fix both blocks).

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
  **Do next:** **D1** tri-theme toggle (dark/ember/light, persisted, from `@lar/
ui` tokens) → **D6 connector-token vault UI** (paste a read-only key →
  encrypted client-side via `@lar/crypto` before storage — the visible proof of
  the encryption pillar; uses `createVaultStore(localStorage)`) → **D4**
  watchlist/hero chart → **D5** agenda. (`@lar/connector-finance` already
  exports the analytics + read-only adapters the UI consumes.) Then Phase 3.
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
