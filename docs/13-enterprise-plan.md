# 13 — HeyLar enterprise plan (to 2027-01-01)

> Authored 2026-06-10 from a 2-stream research pass (platforms/ops · integrations/
> local-first E2EE) + the state of the repo. This is the operating plan we execute
> and iterate. Owner: Alberto (product decisions) + the AI build fleet (execution).
> Open decisions live in §10 — nothing blocks on them except where marked.

## 0. North star & deadline

**Deadline: 2027-01-01 — production-ready staging.** Definition of done:

- The portal + marketing site live on `staging.heylar.ai` / `heylar.ai` (Vercel),
  CI-gated, observable, with real accounts (auth), real read-only finance data,
  subscriptions skeleton (Stripe test mode), and the mobile app in closed beta.
- Security: external review of the E2EE/key design, gitleaks + audit gates green,
  privacy policy + ToS drafted, GDPR posture documented.
- A feature-frozen beta cohort can use it daily without us touching a server.

**Thesis (unchanged):** Lar is a privacy-first, voice-driven personal OS layer —
"the guardian of your home" — that routes you OUTWARD to the best place for each
thing. Your data stays yours. We never monetize user data (see §7).

---

## 1. Corporate & tooling foundation (do this week)

### 1.1 GitHub

- **DECIDED 2026-06-10:** org is **`Hey-Lar`** (github.com/Hey-Lar) on
  **Enterprise** — Alberto created + purchased it. (Context: `lar` and `heylar`
  slugs were taken; Enterprise's SSO/EMU/audit machinery is unused for now but
  gives compliance headroom — enable the audit log + require 2FA org-wide
  immediately; the rest activates at first hires.)
- **Repo topology (keep the monorepo — it is the superpower):**
  - **`lar`** — THE product monorepo (this repo, pushed up): `apps/*` (portal,
    marketing, mobile later), `packages/*`, `services/*`, `docs/*`. Turborepo +
    npm workspaces stays. Do NOT split per-feature repos; shared packages are
    why we ship fast.
  - **`governance`** — charter + policies: PRIVACY.md, SECURITY.md (mirrored),
    licensing policy, brand book, decision log (ADRs), this plan. Public later.
  - **`.github`** — org profile + default community health files.
  - Later: `infra` (IaC), `rooms-registry` (third-party room manifests, §5).
- **Protections on `lar`:** required PR + CI (typecheck/test/lint/gitleaks) on
  `master`, CODEOWNERS, linear history optional, environments for staging/prod.

### 1.2 Domain, email, DNS

- **Domain:** `heylar.ai` stays at GoDaddy (locked there anyway; registrar is
  fine — we only edit DNS records).
- **DECIDED 2026-06-10: Google Workspace** — `alberto@heylar.ai` is live.
  (Pragmatic tooling pick; the product itself stays E2EE — the brand promise is
  about USER data, not our mailbox. Revisit Proton if E2EE optics ever matter
  for company mail.) Add aliases: `hello@`, `security@`, `legal@`.
- **Play Console does NOT need Workspace:** a plain free Google account + $25
  one-time fee suffices (note: personal dev accounts must run a 12-tester /
  14-day closed test before production; an org account w/ D-U-N-S skips it —
  decide when we ship Android).
- **Mailboxes:** `alberto@`, `hello@`, `security@` (alias), `legal@` (alias).

### 1.3 Hosting & website

- **Vercel Pro ($20/seat)** — commercial use requires Pro. Deploy from the
  GitHub org: `apps/portal` → `staging.heylar.ai` (env-gated), `apps/marketing`
  → `heylar.ai`. GoDaddy DNS: apex A record + `staging` CNAME (values from the
  Vercel dashboard); TLS auto-provisioned.
- **Design tooling: v0 Premium ($20/mo)** — generates Next.js/Tailwind/shadcn,
  has GitHub repo import (Feb 2026 update), so iterations drop into our repo.
  Strategy: build the marketing site ourselves with v0 assist; hire a designer
  only if we stall. (Framer AI rejected: no code export = lock-in. Lovable:
  fine for prototypes, overkill here.)
- **Secrets:** Vercel env vars now; adopt **Doppler free tier** as the single
  source of truth (synced → Vercel) the moment mobile/CI lands. Never in git
  (existing gitleaks gate stays mandatory).

### 1.4 Monthly tooling budget (initial)

Vercel Pro $20 · v0 $20 · GitHub Enterprise $21 · Google Workspace ~$7 ·
Doppler $0 · GoDaddy (domain renewal only). **≈ $68/mo** + one-time Play $25.
Add Supabase Pro ($25) and Sentry/PostHog free tiers when wired. Lean by design.

---

## 2. What the Lar ecosystem IS (capability map)

The Lar ecosystem is **the House** — a personal operating layer that sits above
platforms (web now, Android next) and gives the user one private surface for
everything they control. Its seven capabilities:

| capability     | what it does                                              | exists today as                                          |
| -------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| **Understand** | voice/text → structured intent (`LarAction`)              | deterministic parser (6 domains) + cloud-escalation seam |
| **Show**       | glanceable, glassy, calm surfaces                         | portal: 13 tabs, DESIGN.md system                        |
| **Route**      | send you OUTWARD to the best destination                  | connectors: music/podcasts/books/film/places/dictionary  |
| **Guard**      | privacy, read-only finance, fail-closed safety            | `@lar/safety`, `@lar/crypto`, authz, CSP                 |
| **Remember**   | the user-owned profile & taste engine (local-first, E2EE) | vault pattern; full local-first store = Phase B          |
| **Automate**   | routines ("when I wake, show weather + agenda")           | future (Phase D), built on intents                       |
| **Extend**     | third parties add capabilities safely                     | MCP server today; Room SDK = Phase D                     |

---

## 3. Taxonomy & naming — the House language

Proposal: name the architecture after the house (it matches the brand, the Lar
mythology, and the living-room design language we just shipped):

| term            | what it names                                                                                                                                                                                              | today's word          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **The House**   | the whole OS (heylarOS)                                                                                                                                                                                    | the app               |
| **Rooms**       | user-facing capability modules (Music, Wealth, Health, Library…) — the VERTICAL axis                                                                                                                       | blocks/tabs           |
| **Doors**       | outward integrations — every connector is a door out of the house (route-outward made literal)                                                                                                             | connectors            |
| **Foundations** | shared horizontal packages: design system, intent parser, crypto, safety, settings                                                                                                                         | `packages/*`          |
| **Guardians**   | the policy/safety layer (fail-closed gates, kill-switch, read-only finance) — Lar the guardian, plural                                                                                                     | `@lar/safety` + authz |
| **Lar**         | the companion AI at the center — the global ask + the intelligence layer. The app AND the assistant share the one name: users say "ask Lar". (Replaces the earlier "Hearth" name, per Alberto 2026-06-10.) | GlobalAsk             |
| **Surfaces**    | clients: web portal, mobile, voice, marketing                                                                                                                                                              | `apps/*`              |

Alternatives considered: single-word schemes ("Blocks", "Spaces", "Tiles",
"Wings", "Chambers") are flatter but less ownable; "Lares" (the plural spirits)
is lovely for agent personas later. Decision = Alberto's (§10).

## 4. Module structure: vertical × horizontal

- **Vertical = Rooms** (products/variants). Each Room owns: a connector (Door),
  a portal block, intents in the parser, demo data, tests, and a manifest.
  A Room must be shippable independently (we already build this way).
- **Horizontal = Foundations** (features shared across all Rooms): design tokens
  - Icon system, `useAskLar`/AskBar, LarAction contract, crypto/vault, safety
    gates, appearance/settings, auth/identity (Phase B), sync (Phase B),
    telemetry (opt-in, Phase E).
- **Rule:** a Room never reimplements a Foundation; a Foundation never contains
  Room-specific logic. The monorepo enforces this with package boundaries —
  exactly the structure `packages/*` vs `connectors/*` vs `apps/*` already has.
- **Variants** (e.g., Wealth-lite vs Wealth-pro) are flags within a Room, not
  new Rooms — avoids combinatorial explosion.

---

## 5. Ecosystem API — how apps integrate into Lar

Three layers, privacy-ranked:

1. **First-party Doors (core).** The ~10 surfaces that define quality (music,
   media, places, weather, calendar, mail, files, finance) stay hand-built,
   keyless-first, in-repo. No third-party data path.
2. **MCP — the open protocol (primary third-party strategy).** MCP is now the
   industry standard (Linux Foundation governance since Dec 2025; OpenAI,
   Google, Microsoft adopted; 10k+ public servers; OAuth 2.1 remote spec landed
   2025-11). Lar is already an MCP _server_ (read-only finance); the House
   becomes an MCP _host_ too: any vendor that ships an MCP server is instantly
   a candidate Door — gated by Guardians (allow-list, read-only defaults,
   per-Room permissions the user grants like app permissions).
3. **Long-tail OAuth plumbing: self-hosted Nango.** Open-source, Docker
   self-host with cloud parity, 800+ APIs' OAuth/token/sync handled INSIDE our
   infra — user tokens never touch a third party. (Zapier/Pipedream rejected as
   core infra: data flows through their clouds. n8n embed costs ~$50k/yr.
   Zapier remains acceptable ONLY as an opt-in, user-owned bridge.)

**Room SDK (Phase D):** `@lar/room-sdk` — a Room manifest declares
`{ id, name, icon, intents[], entityTypes, doors[], privacy: { network:
'none'|'proxied'|'direct', dataClasses }, surfaces }` + a resolver. Manifests
are signed + reviewed into `rooms-registry`. Third-party Rooms render in a
sandboxed surface, fetch only through the Guardian-gated proxy, and get zero
data by default. This is the "app store" of the House — and because it speaks
MCP, the catalog starts at 10k servers, not zero.

---

## 6. Privacy & data architecture (the Proton model, formalized)

**Data classes — every datum gets one:**

| class                   | where it lives                                     | examples                                           | leaves device?               |
| ----------------------- | -------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| **D0 device-only**      | local storage/SQLite, optionally encrypted at rest | queries, playback choices, health demo, appearance | never                        |
| **D1 E2EE-synced**      | ciphertext on our sync relay; keys ONLY user-held  | vault keys, preferences, taste profile, routines   | ciphertext only              |
| **D2 operational**      | our DB, minimal                                    | account email, subscription status                 | yes (GDPR-scoped, deletable) |
| **D3 opt-in telemetry** | self-hosted analytics, anonymized + aggregated     | feature usage counts                               | only if user opts in         |

**Never:** selling data, ads, third-party trackers, training on user content.
The taste engine (§2 Remember) is computed on-device / on user-keyed data — the
algorithm serves the user's profile, not a corporation's. Codify all of this as
irrevocable principles in the `governance` repo.

**Key architecture (adopt the Ente pattern — cleanest in industry):** one random
256-bit **masterKey** wraps all data keys; the masterKey itself is wrapped
independently by (a) a KEK derived from the passphrase via **Argon2id** (WASM —
upgrade from our PBKDF2; OWASP default), (b) a printed **recovery kit** key, and
(c) later a **passkey+PRF** KEK for convenience unlock (production-proven by
Bitwarden/1Password; Apple support still patchy mid-2026 → never the only
wrapping) and Android **Keystore** on device. References: Proton (recovery
phrase), Signal (zero-knowledge backups), Ente (masterKey multi-wrap).

**Local-first sync engine (Phase B evaluation): Jazz** (jazz.tools) — E2EE by
default, ciphertext-only sync server, self-hostable, TS-native, web + React
Native. Leaner alternative: **Evolu** (E2EE SQLite + CRDT, mnemonic root key).
PowerSync/ElectricSQL are more mature but their servers see plaintext —
disqualifying. Prototype both behind a `@lar/store` Foundation interface.

**Snowflake — honest verdict: no.** There is deliberately almost no server-side
user data to warehouse — that's the product. User content NEVER enters a
warehouse. What we do need: product analytics (D3) → **self-hosted PostHog** (or
Plausible) + business data (subscriptions) in Stripe + a small Postgres. If D2/D3
aggregate volume ever justifies a warehouse (unlikely before 2027), evaluate
Snowflake/BigQuery/ClickHouse then — fed by D2/D3 only.

---

## 7. Business model (privacy-compatible by construction)

1. **Lar Plus subscription** — E2EE sync across devices, cloud intent escalation
   (better voice understanding), premium Rooms, family house. Stripe.
2. **Hardware (2027+)** — a Lar home device ("the Lar"): mic + screen, our
   software, locally-run wake word. Sell the object, not the person.
3. **B2B licensing (opportunistic)** — the House shell / Guardian stack for
   OEMs. Never: ads, data sales, sponsored ranking inside Rooms.

---

## 8. Roadmap: June 2026 → 2027-01-01

Six phases, ~4-6 weeks each, overlapping. Each = increments merged green with
browser verification (the discipline that built the last 30 merges).

- **A — Corporate + deploy (Jun):** org `heylar-ai` + repos + protections; email;
  Vercel Pro; push monorepo; CI on PRs; `heylar.ai` (marketing) + `staging.
heylar.ai` (portal) LIVE; governance repo seeded (PRIVACY/SECURITY/decisions);
  Doppler. Exit: a stranger can visit both sites.
- **B — Identity + data (Jul–Aug):** Supabase auth (or Lar-owned auth — ADR);
  `@lar/store` Foundation; Jazz-vs-Evolu prototype; Argon2id + masterKey
  multi-wrap migration of the vault; settings/prefs as D1; real finance Door
  (Lumina API / T212 read-only) behind the Guardian; Stripe test-mode skeleton.
  Exit: log in on two devices, prefs sync E2EE, real net worth visible.
- **C — Mobile + voice (Aug–Oct):** Expo app `apps/mobile` reusing every
  Foundation; Lar + 4 Rooms on mobile; Android Keystore vault; PWA
  polish (installable, offline shell); wake-word research (on-device).
  Exit: closed test on Play (12 testers).
- **D — Ecosystem (Oct–Nov):** `@lar/room-sdk` + manifest v1 + `rooms-registry`;
  MCP host mode in Lar (the companion) (consume external MCP servers, Guardian-gated);
  self-hosted Nango for 2-3 long-tail Doors; routines v0; developer doc site.
  Exit: one EXTERNAL developer ships a Room.
- **E — Hardening + beta (Nov–Dec):** external security review of key design;
  pen-test pass; observability (Sentry + self-hosted PostHog, D3 opt-in);
  legal (privacy policy, ToS, GDPR record); perf + a11y audits; load test;
  feature freeze mid-Dec; 20-50 person beta cohort.
- **2027-01-01:** production-ready staging. Public launch decision is separate.

**Operating cadence:** weekly milestone + demo screenshot set; ADR for every
architectural choice (in `governance`); HANDOFF.md discipline continues; Alberto
= product owner (decides §10-style questions, reviews demos, owns accounts/
purchases); AI fleet = research → build → review → browser-verify → merge.
The fleet asks before: any account/purchase, any data-class change, any
bright-line-adjacent move, any user-visible naming.

## 9. Top risks

| risk                                            | mitigation                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Solo-founder bus factor / account lockout       | recovery kits for every account, password manager, documented org ownership                         |
| E2EE key design flaw                            | copy proven patterns (Ente/Proton), external review in Phase E, never ship custom crypto primitives |
| Scope explosion (the OS dream vs the deadline)  | Rooms are independently shippable; the deadline ships the House + 8-10 Rooms, not 30                |
| Platform risk (Android assistant restrictions)  | PWA + Expo first; deep OS integration is post-2027                                                  |
| Integration ToS (e.g., scraping-adjacent Doors) | keyless/official APIs only; Guardian-gated; legal review in Phase E                                 |
| Burn on tooling sprawl                          | §1.4 budget reviewed monthly; self-host bias                                                        |

## 10. Decision log (Alberto)

| #   | decision                | options                           | status                                                                         |
| --- | ----------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| D1  | GitHub org slug + tier  | —                                 | **DECIDED 2026-06-10: org `Hey-Lar`, Enterprise**                              |
| D2  | Email provider          | —                                 | **DECIDED 2026-06-10: Google Workspace** (`alberto@heylar.ai`)                 |
| D3  | Architecture naming     | —                                 | **DECIDED 2026-06-10: House language** (Rooms/Doors/Foundations/Guardians/Lar) |
| D4  | Mobile start timing     | —                                 | **DECIDED 2026-06-10: Phase C as planned**                                     |
| D5  | Auth provider (Phase B) | Supabase vs Lar-owned — needs ADR | OPEN (Phase B)                                                                 |
| D6  | Sync engine (Phase B)   | Jazz vs Evolu — prototype both    | OPEN (Phase B)                                                                 |
