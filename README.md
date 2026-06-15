# Lar

**The guardian of your home.** — _"Hey Lar."_

Lar is a glassmorphic, AI-driven control surface for the home — built on Android (AOSP), not a from-scratch OS. It unifies your media, money, health, and home into one fluid, voice-driven interface where **you control the algorithm**, and where Lar routes you _outward_ to the best place for each thing instead of locking you in.

> **Brand:** Lar · **Domain:** heylar.ai · **Wake word:** "Hey Lar"
> _(holding/dev domain: larorg.com)_

---

## Why Lar can exist

Every giant (Apple homeOS, Google Home, Amazon Alexa+, Samsung SmartThings) is building a home hub that pulls you _into_ their walled garden — that's their business model. Lar is the opposite: a neutral, user-owned layer that sits _above_ all the gardens, knows what's where, and routes you to the best one — with a voice agent that does multi-step actions across platforms that Siri/Alexa structurally can't.

**The defensible core:**

1. Cross-platform, user-controlled discovery & routing (music, film/TV, podcasts, books).
2. A voice agent ("Hey Lar") that does real multi-step actions across apps.
3. A neutral money + home + health dashboard that aggregates rather than captures.

---

## Repo map

| Path                                                             | What                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`docs/01-master-spec.md`](docs/01-master-spec.md)               | Full ecosystem architecture — every block, OS/hardware, design system, integrations |
| [`docs/02-music-architecture.md`](docs/02-music-architecture.md) | Reference implementation: the brain → dispatcher → adapter pattern                  |
| [`docs/03-governance.md`](docs/03-governance.md)                 | Governance model + the bright-lines (read-only finance, no advice, no data sale)    |
| [`docs/04-budget-roadmap.md`](docs/04-budget-roadmap.md)         | €4k / 2-year phased budget (€1k now) + roadmap                                      |
| [`docs/05-brand.md`](docs/05-brand.md)                           | Name, voice, domain, visual identity decisions                                      |
| [`docs/06-stack-deployment.md`](docs/06-stack-deployment.md)     | Tech stack + how each surface deploys (Next.js · Supabase · Kotlin)                 |
| [`docs/07-repo-structure.md`](docs/07-repo-structure.md)         | Monorepo layout + when (and what) to split into separate repos                      |
| [`docs/08-build-guide.md`](docs/08-build-guide.md)               | **Phase 1 build playbook — hand this to Claude Code**                               |
| [`docs/09-differentiation.md`](docs/09-differentiation.md)       | The moat, sharpened — why incumbents structurally can't copy this                   |
| [`docs/10-lumina-integration.md`](docs/10-lumina-integration.md) | How the existing "Lumina" build folds in as the money/dashboard pillar              |
| [`docs/11-secrets-and-env.md`](docs/11-secrets-and-env.md)       | Env contract, server-only boundary, secret naming convention, rotation guidance     |
| [`SECURITY.md`](SECURITY.md)                                     | Vulnerability reporting, threat model, bright-lines, enforcement controls           |
| [`CLAUDE.md`](CLAUDE.md)                                         | Auto-loaded Claude Code rules (stack, conventions, bright-lines)                    |
| [`prototype/index.html`](prototype/index.html)                   | **Phase 0 working prototype** — open in a browser                                   |
| `design/`                                                        | Whiteboard exports, screenshots, mockups (drop yours here)                          |

---

## Quickstart

```bash
npm install            # root — npm workspaces + Turborepo
npm run dev            # portal :4200 + marketing :4201
npm test               # all package + app tests (vitest, via turbo)
npm run typecheck      # strict TS across the monorepo
npm run build          # build every package + both Next apps
```

The **portal** (`apps/portal`) is the working glass dashboard; **marketing** is
`apps/marketing`. Tap the amber mic to run the "Hey Lar" flow.
_(Legacy Phase-0 prototype still at [`prototype/index.html`](prototype/index.html).)_

---

## What's built today (2026-06-15)

A polished, single-user, **local-only** web app — not yet a product (no accounts, no
live sync backend, no deploy). The honest map is [`HANDOFF.md`](HANDOFF.md) + the
[latest status audit](https://github.com/Hey-Lar/mission-control/blob/main/audits/2026-06-15-status-audit.md)
(~30–33% real).

**🟢 Real + tested (202 tests across 19 files; `npm test` = 35 turbo tasks green):**

- **Privacy spine** — `@lar/crypto` (AES-256-GCM key-hierarchy) + `@lar/store`: a
  local-first, **end-to-end-encrypted** document store with a **multi-device sync
  engine** (ciphertext-only on the wire), **encrypted backup/restore**, and a sev-0
  no-plaintext guard.
- **~16 Rooms** + **11 keyless "route-outward" connectors** (music, podcasts, books,
  film/TV, dictionary, places, weather, translate, news, finance, filings). The
  **Remember** Room is a private, on-device encrypted "personal-context layer" (notes
  - decisions journal + digest).
- Design system (`@lar/ui`), per-handler authz + nonce-CSP, and the `.claude/` agent
  fleet + a (disarmed) CI build runner.

**🔴 Not built yet (the actual product):** accounts/auth, the real sync backend
(Supabase), the AI brain, mobile, deploy, payments, the company. **Next leap =
auth/identity** — see [`HANDOFF.md`](HANDOFF.md).

**Three repos:** [`Hey-Lar/lar`](.) (product) · `Hey-Lar/mission-control` (private ops
— roadmap, audits, strategy; strategy docs moved out of this repo) · `Hey-Lar/governance`
(constitution).

---

## The throughline

**One architecture reused everywhere · your own data as the moat · route users outward instead of capturing them.** That's the part the trillion-dollar incumbents can't copy without breaking their own business models.

---

_Proprietary & confidential. See [LICENSE](LICENSE)._
