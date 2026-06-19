# 23 · Orchestration direction — building on Builderbot

> **Status:** proposed direction (founder-set). **Tracking:** `block/builderbot`
> (Apache-2.0). This doc is the grounded map of _why_ and _what to reuse_; it is
> not yet a committed dependency. Revisit as the repo matures (it went public
> 2026-06-19 but has months of internal history).

## Context

[`block/builderbot`](https://github.com/block/builderbot) is the OSS base of the
internal platform Lar's team uses to run a large, conversational, multi-tool agent
fleet (the founder's framing: "thousands of agents, many MCPs/APIs, used and chatted
with across many tools"). The **public v0** is the human↔agent _control plane_ — the
review/collaboration surfaces + the shared Rust primitives — with the scale-out
orchestration layered internally on top. **Decision intent: build Lar's agent
orchestration model on these primitives / patterns rather than reinventing them.**

This sits directly above the tiered local/cloud AI architecture in
[`docs/22-recon-learnings.md`](22-recon-learnings.md) §3.

## What's actually in the box (inspected 2026-06-19)

**Apps (the human↔agent control planes):**

- **Staged** (Tauri/Rust + Svelte) — visual git workspace that launches **ACP agent
  sessions** (Goose, Claude Code, Codex, Pi) and streams their changes in for review.
- **Penpal** (Go + Svelte) — reviews the _docs_ agents write into `thoughts/`
  (research/plans); comment threads anchored to text; **review workflow** (agent
  requests review → human comments → agent responds); an **MCP server at `/mcp`** so
  agents participate programmatically; agent-presence indicators.
- **Differ** — standalone diff viewer.

**Shared Rust crates (the reusable substrate):**

| crate                | what it is (verbatim description)                                           | Lar reuse / lesson                                                                             |
| -------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `acp-client`         | "Full-featured client for ACP (Agent Client Protocol) agents like Goose/CC" | Drive Lar's skills/agents behind the **open ACP protocol** — vendor-neutral, on-brand for Lar. |
| `builderbot-actions` | "Reusable action execution and detection engine for repo+worktree contexts" | The shape of Lar's **action engine** (propose → detect → execute), generalized beyond repos.   |
| `pm`                 | "Project manager for multi-repo workspaces with **worktree pooling**"       | How you **fan agents out in parallel** with isolation — the scale primitive.                   |
| `blox-cli`           | "Shared sq blox command helpers"                                            | Block-internal CLI glue; not directly reusable.                                                |

## Why it fits Lar (the real parallel)

Builderbot is a **control surface for what agents do** — propose → human reviews →
agent responds, mediated by MCP. That is the **same DNA as Lar** (a neutral control
surface that routes outward) and, crucially, the **same shape as Lar's existing
bright-lines**: auth / money / data-deletion are human-gated; agents draft, a human
approves. Builderbot's review-loop is that pattern as a first-class, MCP-native
runtime. Adopting it means Lar's agent layer gets:

- **ACP** as the agent-driving protocol (swap models/agents without rewiring the UI).
- **Action-engine semantics** (detect → execute in a context) for connector/skill calls.
- **Worktree-pool-style isolation** for running many skills/agents concurrently and safely.
- **An MCP review plane** for the human-gated actions Lar already requires.

## Open questions (validate before committing)

1. **Language boundary.** The substrate is **Rust**; Lar is TypeScript/Next.js today
   and React Native next. Reuse path = link the Rust crates (FFI / a sidecar / WASM)
   vs. port the _patterns_ to TS. Likely "patterns first, crates later."
2. **Domain distance.** Builderbot's actions are **repo+worktree** shaped (operate on
   code); Lar's are **connector/home** shaped (route to weather/music/money). The
   `actions` engine is a pattern to adapt, not a drop-in.
3. **Where the scale-out engine lives.** The "thousands of agents" orchestrator is the
   team's internal extension; track whether/when it (or MCP-fleet bits) lands in OSS.
4. **Licensing** — Apache-2.0 ✅ (clears Lar's permissive-only rule).

## Tracking

A scheduled watcher polls `block/builderbot` for **new releases/tags** and **notable
`feat:` commits** (esp. anything MCP / ACP / orchestration / fleet), reporting deltas
against the baseline below.

- Baseline (2026-06-19): latest releases `staged/v0.1.8` (2026-03-31), `penpal/v0.2.0`
  (2026-03-03); HEAD ≈ PR #802. Highly active (multiple commits/day).
