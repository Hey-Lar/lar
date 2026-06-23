# Lar — Folding in the "Lumina" build

_Context: the personal-OS work previously called **Lumina OS** (repo `life-os` / scope `@life-os/_`) is not a separate product — it is **Lar's money + dashboard pillar, already half-built.** This doc maps what exists onto Lar's architecture so nothing is rebuilt that's already proven.\*

> The earlier work and Lar were converging on the same idea from two ends: a warm, glassy, voice-ready control surface for your whole life. Lar is the bigger, better-articulated frame; Lumina is a working finance/dashboard implementation of it. **Lar is the brand and the vision; Lumina's code is the seed of the finance block + the design system.**

---

## 1. What already exists (harvestable today)

| Lumina asset (`life-os`)                                                                              | What it is                                                                                                                                           | Lands in Lar as                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Control Deck** (`prototypes/control-deck`)                                                          | Single-file glass kiosk: left icon rail, big hero clock, KPI strip, markets table, charts, **3 themes** (dark/ember/light), ambient idle, panic-lock | The **portal home-display surface** / AOSP-launcher home screen reference. It is _already_ a working "Liquid-Glass-but-ours" home dashboard. |
| **`@life-os/ui`**                                                                                     | 3-theme design tokens + Tailwind preset + glass primitives + focus ring                                                                              | `packages/ui` — and the **ember theme already uses the amber "hearth" accent**, i.e. it is on-brand for Lar by accident.                     |
| **WebCrypto vault** (AES-256-GCM, 600k-PBKDF2, ciphertext-only, CI-tested, 8 tests)                   | Client-side key vault                                                                                                                                | The **connector-token vault** the governance doc calls for (`03-governance.md` → "connector-token vault").                                   |
| **`quiet-margin`**                                                                                    | Read-only net worth, allocation, Monte-Carlo projection, RSU model, liabilities                                                                      | `packages/connectors/finance` + the **Net Worth block**. Already **read-only** — matches the finance bright-line exactly.                    |
| **`@life-os/api`** (Hono `/snapshot`, `/swap-actions`) + **orchestrator** (validate → atomic publish) | Deterministic data pipeline serving a validated snapshot                                                                                             | The **conductor pattern** (deterministic core that _calls models as tools_) — same philosophy as `01-master-spec.md §4`.                     |
| **`@life-os/contracts`** (zod)                                                                        | Validated wire schemas                                                                                                                               | The zod discipline for `packages/shared` (the **LarAction** contract spine).                                                                 |
| **Launcher** (AppManifest plugin contract, hash routing, lazy chunks)                                 | Multi-app plugin host                                                                                                                                | The **block/connector plugin pattern** for Lar's blocks.                                                                                     |
| **CI + privacy gate** (staged-file secret grep; finance data never committed)                         | Guardrails                                                                                                                                           | Lar's "never commit secrets / isolate finance" governance, ready-made.                                                                       |
| **159 passing tests**                                                                                 | —                                                                                                                                                    | Harvest, don't discard.                                                                                                                      |

**The punchline:** Lar's Net Worth block is _not_ a greenfield build. Lumina's `/snapshot` API already emits the exact read-only finance shape (net worth, allocation, goals, alerts, emergency-fund) that Lar's finance connector needs — the Control Deck already consumes it live.

---

## 2. Stack reconciliation (the one real friction)

|                 | Lumina (`life-os`)              | Lar (spec)                             | Porting cost                                                       |
| --------------- | ------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| Monorepo        | Turborepo + **npm** workspaces  | Turborepo + **npm** workspaces         | none (both on npm)                                                 |
| Web             | React + **Vite**                | React + **Next.js** (App Router)       | medium (Vite app → Next routes; components port ~as-is)            |
| Backend         | Hono + pluggable JSON/libsql    | **Supabase** (Postgres + Auth + RLS)   | medium (new auth/RLS; the snapshot pipeline can stay as a service) |
| Styling         | Tailwind + `@life-os/ui` tokens | Tailwind + `packages/ui`               | **near-zero** (tokens + glass port directly)                       |
| Design language | 3-theme glass, amber "ember"    | "Liquid Glass, but ours", amber hearth | **already aligned**                                                |

Design + types + the finance logic port cleanly. The deltas are _build tooling_ (Vite→Next; both monorepos already use npm) and _backend_ (add Supabase auth/RLS). The Control Deck is vanilla HTML/JS, so it can either become a Next client component or remain the **home-display reference** verbatim.

---

## 3. Recommended migration path (staged, low-risk)

**Phase 1 (now):** Stand up the clean Lar monorepo per `docs/07`. Build the **Music wedge** here (it's the thesis). In parallel, **point `connectors/finance` at Lumina's existing `/snapshot`** — the finance block works on day one by _consuming_ what's already built, with zero rework. Port `@life-os/ui` tokens into `packages/ui` so both surfaces share one design language.

**Phase 2–3:** Absorb `quiet-margin`'s finance logic into `connectors/finance` natively; port the Control Deck into `apps/portal` (or keep it as the AOSP home-display). Migrate the vault into the connector-token store. Retire the `life-os` repo to "archived seed" once its pieces live in Lar.

**Why staged, not a big-bang rewrite:** the Lumina build has 159 tests + green CI; harvesting it incrementally keeps that safety net while the architecture moves to Lar's cleaner frame. _Never break working code to satisfy a folder diagram._

> Open decision for the founder (see chat): (A) fresh Lar repo + harvest _(recommended)_ · (B) rebrand `life-os` → Lar in place · (C) two repos, Lar consumes Lumina's snapshot as a service. The recommendation above is a pragmatic blend of (A) and (C).

---

## 4. Naming

**Lar / heylar.ai is the product.** "Lumina" is retired as a product name. Where the old `@life-os/*` scope and `life-os` folder persist, treat them as **internal plumbing being migrated**, not the brand — exactly as the Lumina docs already treated `life-os` as internal-only.
