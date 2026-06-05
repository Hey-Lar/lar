# CLAUDE.md — Lar

> Claude Code loads this file automatically every session. Keep it current. Sub-directory CLAUDE.md files override for their folder.

## WHAT this is
**Lar** — a glassmorphic, AI-driven, voice-first home OS ("Hey Lar"). A neutral, user-owned layer that sits *above* platforms and routes users outward to the best one, instead of locking them in. Full specs in `docs/`. Read `docs/01-master-spec.md` and `docs/02-music-architecture.md` before building.

## WHY (the soul — don't violate it)
*Lar* = Galician for home/hearth, from the guardian spirit that protects the home. Warm, personal, user-owned. The brand promise is **"the guardian of your home."** Privacy and user-ownership are features, not afterthoughts.

## Stack
- Web (marketing + portal): **Next.js (App Router) + TypeScript + Tailwind**.
- Backend/auth/db: **Supabase** (Postgres + Auth + Row-Level Security + Edge Functions).
- AI orchestration: server-side functions → **Claude API** (never expose keys client-side).
- Android app (Phase 2): **Kotlin + Jetpack Compose** (native).
- Monorepo: **pnpm workspaces + Turborepo**.

## Repo layout
```
apps/        marketing/  portal/  android/(phase 2)
services/    conductor/  supabase/
packages/    shared/(action contract+types)  ui/  connectors/{music,film,podcasts,books,finance,health}
docs/  design/  prototype/
```

## The spine
`packages/shared` holds the **structured-action contract** (see `docs/02`). The voice agent, dispatcher, connectors, and any Zapier/MCP layer ALL speak this one schema. Validate with zod.

## BRIGHT-LINES (never cross — see docs/03)
- **Finance: READ-ONLY aggregation only.** Never move money. Use a licensed AISP (GoCardless Bank Account Data / TrueLayer / Plaid). Lar is not a regulated entity.
- **No financial or medical advice.** Information only; show disclaimers.
- **Never host/stream others' content.** Lar is a controller/router: deep-link, system-control, or official API — never a player.
- **No selling or training on user behavioural data.** Local-first; user data stays the user's. Enforce with Supabase RLS.
- **Never depend on Spotify's recommendation/audio endpoints** (cut off to new apps). Recommendations run on our own data (ListenBrainz/MusicBrainz/Odesli + user history).

## Conventions
- TypeScript strict; no `any`. Server Components by default; `"use client"` only when needed.
- All secrets in env vars / Supabase; never commit keys. `.env` is gitignored.
- DB access only through Supabase client in server code; rely on RLS.
- Commits: imperative mood, < 72 chars. Conventional-commit prefixes welcome.
- Keep the action contract the single source of truth for cross-surface types.

## Commands (fill in as scaffolded)
- `pnpm dev` — run dev servers
- `pnpm build` — build all
- `pnpm lint` / `pnpm typecheck`

## Workflow
Explore → Plan → Implement → Commit. Follow `docs/08-build-guide.md` task by task. Ask before destructive actions.
