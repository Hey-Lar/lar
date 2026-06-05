# Plan — Lar V2: security-first merge + Dashboard V2

> Synthesized by a 5-agent research orchestration (invest-bot-personal arch · security/governance + favourite-repos · external repos via web search · Lar posture + life-os vault). Branch: feat/v2-security-foundation. Source research: lar-web-research.md / lar-favrepos.md (workflow output).

# Project "Lar" — Unified Build Plan (Security-First → Harvest → Libraries → Dashboard V2 → Deploy)

## Executive summary

Lar today is intent-rich but enforcement-poor: strong written bright-lines, a genuinely code-enforced read-only finance path (`packages/connectors/finance/src/snapshot.ts`), and a minimal `.gitignore` — but **zero encryption, zero secret-scanning, no SECURITY.md, no CI, no env-contract template**. This plan front-loads security: a reusable client-side crypto package migrated from the life-os WebCrypto vault (AES-256-GCM / PBKDF2-600k, 8-test contract), gitleaks pre-commit + a fail-closed CI gate, `.gitignore` hardening, SECURITY.md, and env/governance docs. It then harvests the founder's own `invest-bot-personal` repo (read-only adapters, finance math, KPI/holdings UI, a read-only MCP subset with fail-closed gates) into Lar packages. External libraries are permissive-only (MIT/Apache/BSD/ISC/public-domain), with AGPL/MPL tools flagged as external-CLI-only. Dashboard V2 extends the existing Overview/Wealth/Music/Podcasts blocks with read-only markets/trading, a tri-theme toggle, and an agenda. Deploy targets Vercel (server-only secrets, nonce CSP, security headers) then Android (Tink + Keystore). Bright-lines hold throughout: **read-only finance, no advice, no real secrets committed, informed-by-research not copied** (the founder's own repos are fair to harvest).

---

## A) SECURITY & SECRET-PROTECTION HARDENING

Small, independent, subagent-ready tasks. KEYLESS (no live credentials needed for any). TDD where there is logic.

### A1. `@lar/crypto` package — client-side encryption vault (TDD, KEYLESS) ⭐ highest leverage

- **Files touched:** new `packages/crypto/` → `package.json`, `tsconfig.json`, `src/index.ts`, `src/vault.ts`, `src/types.ts`, `src/vault.test.ts`. Add to root workspaces. Source of truth: `D:\Claude\life-os\prototypes\control-deck\vault.js` + `vault.test.mjs`.
- **What:** Port the pure WebCrypto core to a TS ESM module: `encryptSecret(secret, passphrase) → Promise<VaultRecord>`, `decryptSecret(record, passphrase) → Promise<string>`, `deriveKey`, base64 helpers, exported `VaultRecord` type and `PBKDF2_ITERATIONS` constant. Params load-bearing: PBKDF2-HMAC-SHA-256 **600,000** iters → AES-256-GCM, fresh 16-byte salt + 12-byte IV per encrypt; record `{ v:1, kdf:'PBKDF2-SHA256', iter, salt, iv, ct }`. Runs in browser + Node ≥20 (`globalThis.crypto.subtle`). **Split out** the `localStorage`-bound `save/load/remove/listProviders` behind a pluggable `Storage`-like interface (or omit from core) so the package stays environment-agnostic.
- **TDD — port all 8 behaviors verbatim:** (1) API shape + `PBKDF2_ITERATIONS===600000`; (2) round-trip with correct passphrase; (3) stores ONLY ciphertext (no plaintext/marker in serialized record); (4) self-describing record `{v:1,kdf:'PBKDF2-SHA256',iter:600000}` with truthy salt/iv/ct; (5) wrong passphrase throws (GCM auth fail, not garbage); (6) weak passphrase `<8` chars throws `/8 characters/`; (7) fresh salt+IV per encrypt (two encrypts of same plaintext differ in salt/iv/ct); (8) legacy record with no `iter` falls back to 600k.
- **Acceptance:** `npm test -w @lar/crypto` green on all 8; `npm run typecheck` clean; no `node_modules` runtime deps (WebCrypto only); package exports `encryptSecret`/`decryptSecret`/`VaultRecord`. Plaintext + passphrase never persisted; storage adapter (if included) writes ciphertext only.

### A2. `.gitignore` hardening (KEYLESS, no logic)

- **Files touched:** `C:\Users\Amari\Desktop\HeyLar.ai\Lar\.gitignore`.
- **What:** Add missing enterprise/Android credential patterns on top of current `.env*`, `*.local`, `secrets/`, `*.key`, `*.pem`: `*.p12`, `*.pfx`, `*.keystore`, `*.jks` (Android signing — Phase 2), `id_rsa*`, `*.crt`, `*.cer`, `.env.local`, `*-service-account*.json`, `*credentials*.json`, `*.secret`, `*token*`. Add the broad-glob + `!`-exception pattern from invest-bot so committed files whose names match (`SECURITY.md`, future `*.template.yaml`) are explicitly re-included. Keep `*.template.*` / `*.example` committable; `*.local.*` ignored.
- **Acceptance:** `git check-ignore` returns a match for each new pattern (e.g. `app.keystore`, `gcp-service-account.json`, `id_rsa`); `SECURITY.md` and `.env.example` are NOT ignored (`git check-ignore` exits non-zero for them).

### A3. gitleaks config + `.pre-commit-config.yaml` (KEYLESS)

- **Files touched:** new `.gitleaks.toml`, `.pre-commit-config.yaml`.
- **What:** `.gitleaks.toml` uses `[extend] useDefault = true` (inherits AWS/GitHub-PAT/private-key/high-entropy rules), then `[allowlist]` with placeholder regexes (`paste-the-key-here`, `<your-api-key>`, `xxxxx+`, `test-key`/`sample-key`/`dummy-key`), env-var **names** (`LAR_ANTHROPIC_KEY`, `LUMINA_API_BASE`, `T212_API_KEY`, future `SUPABASE_*`), and path allowlist (`\.md$`, `\.env\.example$`, the config itself, `*.test.ts`). No custom key rule (avoids self-match). `.pre-commit-config.yaml`: `pre-commit/pre-commit-hooks@v5.0.0` (`trailing-whitespace`, `end-of-file-fixer`, `check-yaml`, `check-json`, `check-added-large-files --maxkb=500`, `check-merge-conflict`, `check-case-conflict`, **`detect-private-key`**) + `gitleaks/gitleaks@v8.21.2` pointed at `.gitleaks.toml` (local == CI).
- **Acceptance:** `pre-commit run --all-files` passes clean on the repo; a deliberately staged fake AWS-shaped key (`AKIA...`) is **blocked** by both `detect-private-key`/gitleaks; placeholder strings in `.env.example` are NOT flagged.

### A4. CI secret gate — fail-closed (KEYLESS)

- **Files touched:** new `.github/workflows/security.yml`.
- **What:** Job `gitleaks` ("Secret scan") on push (any branch) + PR to `main` + weekly cron (`0 2 * * 0`). `actions/checkout` with `fetch-depth: 0` (full history). `gitleaks/gitleaks-action` with `config-path: .gitleaks.toml`. **Ship fail-closed from day one** (no warning-only phase — Lar controls the allowlist). Minimal `permissions:` (`contents: read`; `pull-requests/issues: write` only if posting advisory comments). Advisory comment text encodes the **revoke-before-scrub** rule (revoke at source FIRST, then `git filter-repo`, then force-push).
- **Acceptance:** workflow YAML is valid (`actionlint` or CI dry-run); a PR introducing a fake secret **fails** the job (red check, merge-blocking); a clean PR passes.

### A5. Main CI workflow — quality + dep scan (KEYLESS)

- **Files touched:** new `.github/workflows/ci.yml`, `.github/dependabot.yml`.
- **What:** Jobs: `typecheck`, `test` (vitest/turbo), `lint` (prettier `--check`), `npm audit --audit-level=high`. Pin Node — resolve the `engines.node >=20` (root `package.json`) vs CLAUDE.md/HANDOFF "Node 24" mismatch; pin one in CI matrix. `dependabot.yml` for npm + github-actions ecosystems (satisfies `docs/03` "dep scanning" operational line).
- **Acceptance:** all jobs green on current `main`; an intentionally-failing test or `any`-leak turns the relevant job red; Node version pinned and consistent with docs.

### A6. `SECURITY.md` (KEYLESS, no logic)

- **Files touched:** new `SECURITY.md` (root).
- **What:** Vulnerability-disclosure policy (GitHub **private security advisories**, no public issues for vulns), supported versions (`main` only), expected report contents (repro/component/severity/PoC). Threat-model table mapping each component to its attack surface (crypto vault → passphrase handling / record tampering; finance connector → credential leakage / log injection; future MCP → gate bypass / audit-log tampering). State bright-lines: **read-only finance / no money movement / no advice**. Encode **revoke-before-scrub** as the canonical incident rule.
- **Acceptance:** `SECURITY.md` present at root and NOT gitignored; lists a private reporting channel, supported versions, and the read-only bright-line; linked from README.

### A7. Env/secret conventions doc + `.env.example` templates (KEYLESS)

- **Files touched:** new `docs/11-secrets-and-env.md`; `apps/portal/.env.example` (+ per-workspace examples where consumed); README pointer.
- **What:** Document the **server-only vs `NEXT_PUBLIC_`** boundary (critical: `LAR_ANTHROPIC_KEY` and any connector tokens are **server-only**, never `NEXT_PUBLIC_`, never logged decrypted). Define naming convention, where prod secrets live (Vercel env now; Supabase Vault / `@lar/crypto` connector-token vault later), rotation guidance (rotate quarterly; broker keys restricted to read-scopes + egress-IP at source). `.env.example` files contain **placeholders only, never values**. Enumerate current contract: `LUMINA_API_BASE`, `LAR_ANTHROPIC_KEY`, `LAR_LIVE`, future `SUPABASE_*`.
- **Acceptance:** `.env.example` files contain no real values (passes gitleaks/A3); doc states the server-only rule and lists every env var the app reads; copying `.env.example` → `.env` yields a runnable dev config shape.

### A8. Governance doc updates + agent safety-gate stance (KEYLESS, no logic)

- **Files touched:** `docs/03-governance.md`, `CLAUDE.md`, `HANDOFF.md`.
- **What:** Update the Security row of `docs/03` from aspirational → "implemented: `@lar/crypto` encryption, gitleaks pre-commit + CI gate, SECURITY.md, env conventions". Add the governance bright-lines harvested from invest-bot: (a) **agent must refuse to disable its own safety gate** (politely explain why — the gate exists so it can't be talked around); (b) **never paste a key into chat** (any LLM — transcripts persist); (c) AGPL/GPL/MPL-source code is **invoked as external CLI over a clean stdout/JSON boundary, never imported/vendored**; (d) keep agent docs accurate in the same commit that changes structure. Add a dependency-risk register stub.
- **Acceptance:** `docs/03` Security row reflects shipped controls; CLAUDE.md + HANDOFF restate the four new bright-lines verbatim and consistently; no contradictions between the three files.

---

## B) INVEST-BOT-PERSONAL → LAR HARVEST MAP

Source root: `D:\Claude\invest-bot-personal\`. Harvest from **tracked files only** (never untracked `*.env.local`, `data/state.yaml`, `data/positions/*`, `data/retirement/inputs.yaml`, `reports/dashboard/*.json`). This is the founder's OWN repo → direct harvest is permitted; re-theme tokens to Lar's palette.

### B1. Intl format helpers → `packages/ui` (or `packages/shared/format`)

- **Source:** `web/lib/format.ts`. **Why:** cached `Intl.NumberFormat` currency/percent/compact — zero-dep, prevents separator bugs, used everywhere.
- **Acceptance:** exported from a Lar package; unit test covers currency/percent/compact + locale fallback; `typecheck` clean.

### B2. Adapter contracts → `packages/connectors/finance/src/contracts`

- **Source:** `web/lib/types.ts` + `design/code/BrokerAdapter.ts` + `design/code/DataAdapter.ts`. **Why:** the `BrokerAdapter`/`DataAdapter`/`Account`/`Position`/`Quote`/`Bar` + `ConnectionStatus`/`isStale()` interfaces make every provider a config swap — backbone of the read-only finance pillar.
- **Acceptance:** interfaces compile under TS strict; existing `snapshot.ts` types reconciled to (or re-exported through) the contracts; no write methods exposed from the read-only surface.

### B3. Read-only data adapters + rate-limit queue → `packages/connectors/finance/src/adapters`

- **Source:** `design/code/adapters/` → `index.ts`, `Polygon`, `YFinance`, `TwelveData`, `Trading212` (read-only path), `errors.ts`, `queue.ts` (`SerialQueue`), `Recording*` (fixture test harness). **Skip:** `Alpaca`/`IBKR`/`Tradier` **write paths**. **Why:** ready-made read-only data adapters + rate-limit queue + a fixture-driven test harness (KEYLESS testing).
- **Acceptance:** adapters behind one barrel; `RecordingAdapter` fixtures drive tests with **no live keys**; queue enforces rate limits; no order/write method reachable.

### B4. Read-only finance math → `packages/connectors/finance/src/analytics` (or `lib/finance`)

- **Source:** `scripts/{retirement-projection,drift,next-contribution,dashboard-math}.ts` + their `.test.ts`. **Why:** pure, tested, I/O-free FIRE Monte Carlo (P10/P50/P90 + P(success)), rebalance-band drift detection, rebalance-by-contribution (never recommends a sell), dashboard math.
- **Acceptance:** ported `.test.ts` pass verbatim under vitest; functions are pure (no I/O); `next-contribution` never emits a sell action (preserves no-advice/read-only posture).

### B5. Read-only MCP service skeleton → `services/mcp` (NEW top-level dir)

- **Source:** `mcp/src/{server,adapters,gates,schema}.ts` + `tools/{account,positions,quotes,symbols,health}.ts`. **Skip:** `tools/orders.ts` and all order-write tools. **Why:** drop-in MCP/integration skeleton with **fail-closed gates** (kill-switch + read-only + audit log), Zod per-tool validation, stdio/SSE transport.
- **Acceptance:** server builds; only read tools registered (account/positions/quotes/symbols/health); `gates.ts` defaults read-only + fail-closed (blocks any mutation before adapter call); audit log writes; **no `orders.ts` present**.

### B6. Fail-closed gate scaffolding → shared safety lib (`services/mcp` or `packages/shared/safety`)

- **Source:** `mcp/src/gates.ts` (+ `web/lib/webhook/gates.ts` pattern, gate logic only — drop order placement). **Why:** kill-switch + read-only enforcement + audit-log pattern; defense-in-depth even though Lar is read-only.
- **Acceptance:** TDD — gate blocks a simulated mutation when read-only flag set; kill-switch env var hard-blocks; stale-state guard fails closed; tests KEYLESS.

### B7. Read-only finance UI → `apps/portal/components/finance`

- **Source:** `web/components/long-term/{HoldingsTable,PiePanel,AllocationDonut,ContributionsTimeline}.tsx` + `web/components/{KpiTile,KpiStrip}.tsx`. **Why:** self-contained read-only holdings/allocation/timeline + CLS-safe KPI strip; re-theme tokens to Lar glass.
- **Acceptance:** components render against demo/synthetic data; use `@life-os/ui`/`@lar` tokens (no per-component colors); read-only (no buy/sell controls); mobile snap-scroll preserved.

### B8. Read-only RSC portfolio page + loader → `apps/portal` finance route

- **Source:** `web/app/dashboard/long-term/page.tsx` + `web/lib/long-term/loadPortfolio.ts` + `t212-client.ts`. **Why:** the cleanest read-only RSC portfolio reference — YAML-snapshot loader with optional live read-only T212 overlay (loader sample data lines 258-300 is **synthetic**, safe).
- **Acceptance:** server-only loader (no client secret exposure); page is GET/read-only (matches `app/api/finance/route.ts` "GET only" bright-line); live overlay is read-scope only and gated behind a user-supplied key stored via `@lar/crypto`.

### B9. Bloom/glass tokens reference → `packages/ui/tokens`

- **Source:** `web/components/Bloom.tsx` + `web/app/globals.css` HSL "Voltrex" tokens (mirror of `design/code/tokens.css`). **Why:** glass bloom + HSL token system aligns with Lar's tri-theme glass; rename accent to Lar's palette (informed-by, not 1:1 copy of upstream tokens).
- **Acceptance:** tokens live in `@life-os/ui`/`@lar/ui` only (CLAUDE.md "design from UI package only"); accents renamed to Lar palette; tri-theme (dark/ember/light) variables present.

### B10. Platform-integration matrix doc → `packages/connectors/finance/docs`

- **Source:** `design/PLATFORM-INTEGRATIONS.md`. **Why:** the broker/data matrix + auth/rate-limit patterns inform Lar's outward-routing finance logic.
- **Acceptance:** doc present; scoped to **read-only** providers; write/order paths removed or clearly marked out-of-scope for Lar.

**Skip entirely for Lar:** `mcp/src/tools/orders.ts`, `web/app/api/tv-webhook/route.ts` + `web/lib/webhook/*` order placement, `design/code/adapters/{Alpaca,IBKR,Tradier}` write paths, day-trading `tilt-guard` PreToolUse hook.

---

## C) EXTERNAL LIBRARIES TO ADOPT (permissive only)

Adopt = install/depend. **Flagged copyleft = external-CLI/tool only, never imported/vendored into shipped code.**

| Library                                  | License                   | Where used                                         | One-line rationale                                                                        |
| ---------------------------------------- | ------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **gitleaks**                             | MIT                       | A3/A4 secret scan (pre-commit + CI)                | Fast regex secret scanner; the enforced pre-push/CI gate.                                 |
| **pre-commit/pre-commit-hooks**          | MIT                       | A3 hygiene hooks                                   | `detect-private-key` + file hygiene on staged files.                                      |
| **@noble/ciphers**                       | MIT                       | future per-field browser crypto (beyond WebCrypto) | Audited zero-dep XChaCha20-Poly1305/AES if `@lar/crypto` needs non-WebCrypto primitives.  |
| **tweetnacl-js**                         | Unlicense (public domain) | optional client-side secretbox/sealed-box          | Tiny battle-tested NaCl; interops with libsodium sealed boxes.                            |
| **age**                                  | BSD-3-Clause              | encrypt config/secret bundles at rest              | Modern keys, no config footguns; repo-adjacent secret bundles.                            |
| **dotenvx**                              | BSD-3-Clause              | commit-safe encrypted `.env` (per-env keys)        | Encrypts `.env` so it's commit-safe; private keys stay out of git/Vercel-visible scope.   |
| **Nosecone (@nosecone/next)**            | Apache-2.0                | Next.js middleware security headers                | CSP/HSTS/X-Frame-Options without the paid Arcjet service (E/deploy).                      |
| **bennycode/trading212-api**             | MIT                       | `connectors/finance` T212 read-only client         | Best typed community T212 client; user supplies read-only key.                            |
| **SnapTrade Node SDK**                   | Apache-2.0                | multi-broker read-only aggregation                 | Strongest permissive multi-broker read-only path (explicit read-only mode).               |
| **plaid-node**                           | MIT                       | US balances/transactions/investments (read)        | Official MIT SDK; store user tokens encrypted via `@lar/crypto`.                          |
| **Google Tink (tink-java/tink-android)** | Apache-2.0                | Android secure storage (Phase 2)                   | Replaces deprecated Jetpack `EncryptedSharedPreferences`; AES-GCM + Keystore + DataStore. |
| **glasscn-ui / shadcn/ui**               | MIT                       | token/component **extraction** into `@lar/ui`      | Glass variants + primitives; vendor tokens, don't depend live (UI-package rule).          |
| **Financial Datasets MCP**               | MIT (verify on repo)      | read-only fundamentals/prices/news                 | Clean read-only market-data surface for an agent.                                         |
| **CoinGecko official MCP**               | vendor-official (hosted)  | read-only crypto market data                       | 15k+ coins; trusted official server (check ToS/rate-limit before embedding).              |

**⚠️ Copyleft — external tool/CLI only, NEVER linked/imported into shipped code:**

- **trufflehog** — AGPL-3.0 — optional CI scan for **live**-key verification; run as CLI step only.
- **SOPS** — MPL-2.0 (file-level) — encrypt structured config as a CLI/dependency; do not modify+ship SOPS source.
- **Ghostfolio / Firefly III / Maybe** — AGPL — reference/clean-room only; do NOT copy code.
- **FinceptTerminal** — AGPL — clean-room reference only.

**Verify-license-before-adopt (quick LICENSE check):** `@yhooi2/shadcn-glass-ui`, Yahoo Finance MCP, finance-tools-mcp, GoCardless community SDKs (also yfinance-based = ToS-gray/fragile — personal read-only use only).

---

## D) DASHBOARD V2 SCOPE

Build on the existing **Overview + Wealth + Music + Podcasts** blocks. All finance is **read-only** (no buy/sell controls anywhere).

- **D1. Tri-theme toggle (dark / ember / light)** — persisted, applied on load; drives all blocks from `@lar/ui` tokens (harvest B9). Matches life-os's tri-theme system.
- **D2. Markets/Trading read-only block** — KPI strip (B7) + holdings table with current/target weight + drift-pp chips (HoldingsTable) + allocation donut/pies (PiePanel/AllocationDonut) + contributions/dividends timeline. Powered by `connectors/finance` read-only adapters (B3) and analytics (B4). No order entry.
- **D3. Wealth/FIRE panel** — retirement Monte Carlo (P10/P50/P90 + P(success)) and rebalance-by-contribution surfaced as read-only projections (B4). Display-only, **no advice language** ("here is your projection," not "you should buy/sell").
- **D4. Watchlist + hero chart** — `lightweight-charts` hero + watchlist (harvest `web/components/{HeroChart,Watchlist}.tsx`), read-only quotes via adapters; staleness indicator via `isStale()`.
- **D5. Agenda block** — today's calendar/agenda surface (Lar already has Calendar MCP available); read-only summary card on the home dashboard.
- **D6. Connector-token vault UI** — small settings panel where a user pastes a read-only broker/API key, encrypted client-side via `@lar/crypto` (A1) before storage; never sent to the server in plaintext, never logged. The visible UX proof of the encryption pillar.
- **D7. Glass shell polish** — Bloom radial glow + Header/Sidebar shell (harvest B9), re-themed to Lar palette; CLS-safe KPI strip; mobile snap-scroll preserved.
- **D8. Static fallback / embed** (optional) — keep `reports/dashboard/index.html` as a zero-build visual reference, not a runtime dep.

---

## E) DEPLOY NOTES

### Vercel (Phase 1 — personal web app)

- **Secrets:** all secrets in **Vercel environment variables**, server-only. `LAR_ANTHROPIC_KEY` and any connector tokens are **never** `NEXT_PUBLIC_`, never shipped to the client, never logged decrypted. Commit only `.env.example` (A7).
- **Server Actions / Route Handlers compile to public endpoints** — enforce authz **inside every** Server Action / Route Handler / Data Access Layer, never rely on middleware alone. Patch/avoid the March-2025 `x-middleware-subrequest` middleware-auth-bypass (CVSS 9.1).
- **Headers:** set explicitly (Next sets none by default) — **Nosecone (Apache-2.0)** + **nonce-based CSP**, HSTS, X-Frame-Options.
- **Crypto boundary:** secret decryption stays **client-only** (user passphrase, `@lar/crypto`) or **server-only** (Vercel env) — never round-trip a decrypted key through logs/telemetry.
- **CI gate before deploy:** A4 (fail-closed gitleaks) + A5 (typecheck/test/lint/`npm audit`) must be green; the staged-file privacy gate must report `clean`.

### Android (Phase 2)

- **Secure storage:** **Google Tink (Apache-2.0)** AES-GCM/AES-SIV + **Jetpack DataStore**, master key backed by **Android Keystore** (DataStore has no built-in encryption — wire Tink yourself). Do not use the deprecated `EncryptedSharedPreferences`. `@lar/crypto` (WebCrypto) covers the JS/web layer; Tink covers native.
- **Signing secrets:** keystore/`*.jks`/`*.p12`/`*.pfx` are gitignored (A2); signing config via CI secrets, never committed.

### Enterprise notes

- Path to the `docs/03` "scale" column: audit logging (harvest gate audit-log pattern B6), dependency-risk register (A8), pen-test + SOC 2 / ISO 27001 readiness later. Quarterly key rotation; broker keys restricted to read-scopes + egress-IP at source. Fail-closed everywhere; kill-switch env vars first-class; agent refuses to disable its own safety gates.

---

## RECOMMENDED EXECUTION ORDER

**Phase 0 — Security foundation (do FIRST, mostly minutes each; A1/A3/A4 are the substantive ones):**

1. **A2** `.gitignore` hardening _(minutes; cheap-now/ruinous-to-leak-later — do before any harvest copies files in)_
2. **A6** SECURITY.md · **A7** env conventions + `.env.example` _(minutes; establish the contract before secrets exist)_
3. **A1** `@lar/crypto` vault package (TDD, 8 tests) ⭐ _(highest-leverage substantive task — unblocks D6/B8 token storage)_
4. **A3** gitleaks `.gitleaks.toml` + `.pre-commit-config.yaml`
5. **A4** fail-closed CI secret gate · **A5** main CI (typecheck/test/lint/`npm audit`) + dependabot
6. **A8** governance doc updates + agent safety-gate stance

**Phase 1 — Harvest the read-only finance core (KEYLESS, fixture-tested):** 7. **B1** format helpers → **B2** adapter contracts → **B4** finance math (port tests) → **B3** read-only adapters + RecordingAdapter fixtures 8. **B6** fail-closed gate lib (TDD) → **B5** read-only MCP service (skip `orders.ts`)

**Phase 2 — Dashboard V2 UI (depends on A1 + B1–B4):** 9. **B9** glass tokens / Bloom → **D1** tri-theme toggle → **B7** finance UI components → **B8** read-only RSC portfolio page 10. **D2** markets block → **D3** Wealth/FIRE → **D4** watchlist/hero → **D5** agenda → **D6** connector-token vault UI (uses `@lar/crypto`) → **D7** shell polish

**Phase 3 — Deploy hardening:** 11. **E/Vercel:** Nosecone headers + nonce CSP + per-handler authz; verify CI green + privacy gate `clean`; first Vercel deploy 12. **E/Android:** Tink + Keystore secure storage (Phase 2 app)

**Sequencing rationale:** security tasks are prioritized ahead of all harvest/UI work — `.gitignore` and the env contract land _before_ any code that touches secrets is copied in; the crypto vault (A1) and the CI gates (A4/A5) are the load-bearing enforcement that every later phase relies on. Each task is independently implementable and (where it has logic) TDD-able and KEYLESS.
