# HANDOFF — read this FIRST in any new Lar chat

Single source of continuity for **Lar** (heylar.ai). A fresh session reads this
and resumes with zero loss. Kept current as work proceeds.

> **Lar** = the guardian of your home. A neutral, voice-driven control surface
> that routes you *outward* to the best place for each thing. Read `README.md`,
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
  + a live smoke (`LAR_LIVE=1`) confirmed end-to-end (text → Odesli → Tidal
  deep link, ~1.3s). Bright-line honored: links only, never audio.
- `packages/connectors/finance` — **read-only** snapshot client that **consumes
  Lumina's `/snapshot`** (`normalizeSnapshot` + `fetchFinanceSnapshot`). 6 tests.
  GET only, no write path; isolated for a future AISP swap + repo split.
- `packages/ui` — Lar design tokens (amber "hearth" + glass) + a Tailwind
  preset; descends from the Lumina "ember" theme.
- **24 tests green; typecheck + prettier clean.** `docs/09-differentiation.md`
  and `docs/10-lumina-integration.md` written.

## NEXT increment (do this next)

**`apps/portal` — the Next.js glass dashboard + the wired Music wedge.**
- `create-next-app` (App Router, TS, Tailwind) in `apps/portal`; use the
  `@lar/ui` preset; port the look from `prototype/index.html` (left rail; Home /
  Music / Wealth / Health blocks; "Liquid-Glass-but-ours", amber hearth).
- Music block functional: mic (Web Speech API) → POST transcript to a route
  handler `/api/lar` → **deterministic parse (keyless)**, escalate to the Claude
  API only if `LAR_ANTHROPIC_KEY` is set and confidence is low → `resolveMusic`
  → return `{action, openUrl}` → client opens the deep link + renders the glass
  now-playing + "Available on" row.
- Wealth block reads `connectors/finance` → set `LUMINA_API_BASE` to your running
  Lumina API (`http://localhost:3001`) to see real money; else show the styled
  shell.
- Add `transpilePackages: ['@lar/shared','@lar/ui','@lar/connector-music','@lar/connector-finance']` in `next.config`.
- Verify: `npm run dev` (or build) → screenshot via Chrome MCP at a wide
  viewport. Then `apps/marketing` (the "wow" landing) per `docs/08` §8.

## Build / verify / push

- Install: `npm install` (root). Test all: `npm test` (turbo). Typecheck:
  `npm run typecheck`. Lint: `npm run lint` (prettier --check). Format:
  `npm run format`.
- Live music smoke: `cd packages/connectors/music && LAR_LIVE=1 npx vitest run`.
- Commit per increment; keep this file current.

## Credential gates (need YOUR account/keys — like GitHub auth was)

| To finish | Needs |
|---|---|
| Sign-in + per-user prefs/history (RLS) | **Supabase** project (URL + anon/service keys) → `services/supabase` |
| Cloud intent escalation (hard/ambiguous voice) | **Anthropic API key** (`LAR_ANTHROPIC_KEY`, server-only) |
| Real money in the Wealth block | a running **Lumina API** (`LUMINA_API_BASE`) — already exists |
| Reliable explicit-Spotify routing | a Spotify-auth seed (Odesli misses Spotify from an Apple seed) |
| GitHub remote + Vercel CI | `gh repo create lar --private` (account action — confirm first) |

Everything NOT in this table is buildable now (keyless). The Music wedge +
finance-via-Lumina already work without any key.

## BRIGHT-LINES (never cross — docs/03)

Read-only finance (no money movement) · no financial/medical advice · never
host/stream others' content (controller/router only) · no selling/training on
user data · never depend on Spotify's recommendation endpoints.
