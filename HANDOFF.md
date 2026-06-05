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
- **Known minor follow-ups** (non-blocking, flagged in final review): the portal
  blocks inline-duplicate their resolution types + carry a couple of dead `??`
  fallbacks (matches the MusicBlock pattern); `PodcastsBlock`'s Copy-RSS
  `setTimeout` isn't cleared on unmount; neither ask-bar guards against
  overlapping in-flight requests (an `AbortController` would fix both blocks).

## NEXT increment (do this next)

Pick up any of these (all build on the working core):

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

## BRIGHT-LINES (never cross — docs/03)

Read-only finance (no money movement) · no financial/medical advice · never
host/stream others' content (controller/router only) · no selling/training on
user data · never depend on Spotify's recommendation endpoints.
