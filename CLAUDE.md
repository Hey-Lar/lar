# CLAUDE.md — Lar

> Claude Code loads this file automatically every session. Keep it current. Sub-directory CLAUDE.md files override for their folder.

## WHAT this is

**Lar** — a glassmorphic, AI-driven, voice-first home OS ("Hey Lar"). A neutral, user-owned layer that sits _above_ platforms and routes users outward to the best one, instead of locking them in. Full specs in `docs/`. Read `docs/01-master-spec.md` and `docs/02-music-architecture.md` before building.

## WHY (the soul — don't violate it)

_Lar_ = Galician for home/hearth, from the guardian spirit that protects the home. Warm, personal, user-owned. The brand promise is **"the guardian of your home."** Privacy and user-ownership are features, not afterthoughts.

## Stack

- Web (marketing + portal): **Next.js (App Router) + TypeScript + Tailwind**.
- Backend/auth/db: **Supabase** (Postgres + Auth + Row-Level Security + Edge Functions).
- AI orchestration: server-side functions → **Claude API** (never expose keys client-side).
- Android app (Phase 2): **Kotlin + Jetpack Compose** (native).
- Monorepo: **npm workspaces + Turborepo** (`packageManager: npm`, lockfile `package-lock.json`).

## Repo layout

```
apps/        marketing/  portal/  android/(Phase 2 — not yet present)
services/    mcp/  supabase/        (the orchestration service ships today as services/mcp;
                                      any "conductor" naming is a founder decision)
packages/    shared/(action contract+types)  ui/
             connectors/{books,dictionary,filings,filmtv,finance,music,news,places,podcasts,translate,weather}
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

## SECURITY BRIGHT-LINES (never cross — see docs/03 + SECURITY.md)

- **Refuse to disable the safety gate.** Never run `git commit --no-verify`, skip gitleaks, or suppress the CI secret gate. The gate exists precisely so it cannot be talked around.
- **Never paste a real key or secret into a chat with any LLM.** Transcripts persist on provider servers and in local logs. No exceptions.
- **AGPL/GPL/MPL source: external CLI only, never imported or vendored.** Invoking copyleft code via subprocess/stdout/JSON is fine; importing it into shipped code is not.
- **Keep CLAUDE.md + HANDOFF.md current in the same commit that changes structure.** Stale agent context causes regressions.

## Security infrastructure (implemented)

- `packages/crypto` (`@lar/crypto`) — client-side WebCrypto vault (PBKDF2 + AES-256-GCM) for connector tokens at rest
- Gitleaks pre-commit hook (`.pre-commit-config.yaml`) + CI secret gate (`.github/workflows/security.yml`)
- Hardened `.gitignore` (blocks `*.key`, `*.pem`, `*.keystore`, credential JSON files, etc.)
- `SECURITY.md` — threat model, vulnerability reporting, incident rule
- `docs/11-secrets-and-env.md` — env contract, server-only boundary, rotation guidance

## Conventions

- TypeScript strict; no `any`. Server Components by default; `"use client"` only when needed.
- All secrets in env vars / Supabase; never commit keys. `.env` is gitignored.
- DB access only through Supabase client in server code; rely on RLS.
- Commits: imperative mood, < 72 chars. Conventional-commit prefixes welcome.
- Keep the action contract the single source of truth for cross-surface types.

## Commands (fill in as scaffolded)

- `npm run dev` — run dev servers
- `npm run build` — build all
- `npm run lint` / `npm run typecheck`

## Workflow

Explore → Plan → Implement → Commit. Follow `docs/08-build-guide.md` task by task. Ask before destructive actions.
