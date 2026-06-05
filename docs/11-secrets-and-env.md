# Secrets and env conventions

_This document is the canonical reference for how Lar handles environment
variables and secret material. Read `SECURITY.md` for the broader security
policy. All rules here apply to every app, package, and service in this
monorepo._

---

## The server-only / `NEXT_PUBLIC_` boundary

This is the most important rule. Violating it ships a secret to every user's
browser.

| Variable prefix | Bundle target                                                               | Rule                                                                                                                             |
| --------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| _(no prefix)_   | **Server only** — Next.js Route Handlers, Server Components, Edge Functions | **Allowed for secrets.** Never accessible in client-side code.                                                                   |
| `NEXT_PUBLIC_`  | **Client + server** — included in the browser JS bundle                     | **Never put a secret here.** Safe only for public-facing values (e.g. a public Supabase anon key that is already scoped by RLS). |

**`LAR_ANTHROPIC_KEY` and any connector or broker tokens are server-only.**
They must never be prefixed `NEXT_PUBLIC_`, never assigned to a variable that
reaches a React component, and never logged decrypted.

---

## Naming convention

| Prefix         | Meaning                                          |
| -------------- | ------------------------------------------------ |
| `LAR_`         | Lar-specific runtime secrets (API keys, tokens)  |
| `LUMINA_`      | Lumina API integration values                    |
| `NEXT_PUBLIC_` | Intentionally public values only — never secrets |

All names are uppercase with underscores. Document every variable here and in
`.env.example` before shipping the code that reads it.

---

## Current env contract

| Variable            | Scope            | Purpose                                                                                                                                                                                                  |
| ------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LUMINA_API_BASE`   | Server-only      | Base URL for the Lumina finance API (read-only aggregation). When set, `/api/finance` fetches a live snapshot; when unset the route returns a demo snapshot.                                             |
| `LAR_ANTHROPIC_KEY` | **Server-only**  | Anthropic API key for cloud intent escalation in `/api/lar`. Used only when the deterministic parser returns low confidence. Never reaches the client bundle. Gated — the keyless path works without it. |
| `LAR_LIVE`          | Test-runner flag | Set `LAR_LIVE=1` to run live-network smoke tests (`vitest run` in `packages/connectors/music` and `packages/connectors/podcasts`). Not read by the portal at runtime; not required in Vercel env vars.   |

---

## Where production secrets live

**Now (Phase 1):** Vercel environment variables. Set each server-only variable
in the Vercel project dashboard under Settings → Environment Variables. Mark
them as "Server" scope — never "All" unless the variable is genuinely public.

**Later (Phase 2+):** Supabase Vault for per-user connector tokens (broker
keys, finance provider tokens). The `@lar/crypto` connector-token vault
(`packages/crypto`) will encrypt tokens at rest before writing to Supabase;
only the `VaultRecord` ciphertext is stored, never the raw key.

**Never:** committed to git, pasted into a chat with any LLM (transcripts
persist), embedded in client-side code, or written to logs.

---

## Rotation guidance

- Rotate all API keys and connector tokens approximately quarterly.
- API keys for financial data providers (Lumina, GoCardless, TrueLayer, Plaid)
  must be provisioned with **read-only scope** and **IP-restricted** at the
  source before being used in production.
- The Anthropic API key (`LAR_ANTHROPIC_KEY`) should also be read-restricted to
  the Vercel egress IPs.
- Maintain a master copy of every key in a password manager. Operational copies
  live in Vercel env vars only — never in `.env.local` on a shared machine.
- If a key is suspected compromised: **revoke first** at the source, then
  rotate. See `SECURITY.md` → "Incident rule".

---

## `.env.example` files

Every app that reads env vars must ship a `.env.example` at its root.
`.env.example` files contain **placeholder values only — never real values**.
They are explicitly allowed through `.gitignore` (`!.env.example`,
`!**/.env.example`) and also allowed through the gitleaks allowlist
(`.gitleaks.toml`).

To start local development, copy the file and fill in:

```bash
cp apps/portal/.env.example apps/portal/.env.local
# then edit .env.local with real values — .env.local is gitignored
```

`.env.local` is gitignored and must never be committed.

---

## Checklist before merging a PR that touches secrets

- [ ] No real key/value pair appears in any committed file
- [ ] Any new env var is documented in this file and in the relevant `.env.example`
- [ ] New server-only vars have no `NEXT_PUBLIC_` prefix
- [ ] `git check-ignore apps/portal/.env.example` returns nothing (file stays committable)
- [ ] `npx gitleaks detect --no-git` passes locally
