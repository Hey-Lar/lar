# deck/ — the LAR Control Deck and its centralised backend

The **Control Deck** (`lar-control-deck.html`) is the founder-facing status
dashboard, published as a claude.ai artifact. Five views: **Overview · Board ·
Tracks · Engine · Ledger**.

Its backend is **one file**: [`deck-data.json`](deck-data.json) — the single
source of truth for every fact the deck displays. The HTML is a _render_ of
that JSON; nothing on the deck may state a fact the JSON does not hold.
This mirrors the repo's spine philosophy (`packages/shared`): one schema,
many surfaces.

## The deck fleet (spin off in Buzz / any agent launcher)

Versioned specs in `.claude/agents/`, least-privilege each:

| agent              | owns                                           | writes                          |
| ------------------ | ---------------------------------------------- | ------------------------------- |
| **deck-conductor** | autonomous builds FROM the Board (one per run) | product code on `claude/*`      |
| **deck-steward**   | the whole refresh cycle + the merged snapshot  | `deck-data.json` (all sections) |
| **deck-telemetry** | measured facts: commits, tests, modules, gate  | nothing (read-only reporter)    |
| **deck-board**     | Board + Tracks: queued / gated / done, track % | `deck-data.json` board+tracks   |
| **deck-publisher** | the render + artifact republish (same URL)     | `lar-control-deck.html`         |

**Default moves:** spin off `deck-steward` for a refresh — it drives
collect (telemetry) → curate (board) → merge → render + publish (publisher)
and commits one reviewable diff. Spin off `deck-conductor` to **build
autonomously from the deck**: it takes the Board's top queued item, ships one
gated increment on a `claude/*` branch, then runs the steward cycle so the
Board reflects reality. Spin off the individual agents for a targeted pass.

## Model-agnostic mirrors (Goose / ACP)

The same five roles exist as **Goose recipes** in
[`.goose/recipes/`](../.goose/README.md) — runnable on any model Goose is
configured for (`goose run --recipe .goose/recipes/deck-conductor.yaml`), and
launchable from Builderbot's Staged via ACP (see
`docs/23-orchestration-builderbot.md`). The conductor/steward recipes declare
the others as `sub_recipes`, so the orchestration shape is identical on both
sides. **Parity rule:** a role change touches its `.claude/agents/*.md` and
`.goose/recipes/*.yaml` in the same commit. Orchestration patterns follow
mission-control `governance/orchestration-models.md` (single context-owner by
default; fan-out / evaluator–optimizer / judge panel / quarantine only when
earned; tiered autonomy over everything).

## `deck-data.json` schema (version 1)

Top-level: `version` · `asOf` (YYYY-MM-DD) · `generatedBy` · `repo` (which repo
the snapshot describes — the deck can report a sibling repo, e.g. `lar-brain`)
· `notes[]` (discrepancies, corrections, unreachable sources) · five view
sections:

- `overview` — `headline`, `statusPills[]`, `justLanded {sha, text}`,
  `heroStats[] {label, value, info?}`
- `board` — `goal`, `health`, `queued[] {title, note?}`,
  `gated[] {title, gate}`, `done[] {title, commit}`
- `tracks` — `overallPct`, `summary`,
  `items[] {name, scope, pct, movedBy?}`, `needsYou {title, body}`
- `engine` — `summary`, `dataFlow`,
  `modules[] {name, tests, blurb, deps[], exports, guarantee}`
- `ledger` — `summary`, `phases[]`, `commitTypes {type: count}`,
  `commits[] {sha, type, subject, note?}`

Rules that make the contract worth having:

1. **Evidence or `"unknown"`.** Every number is measured (telemetry) or cited
   (board → HANDOFF/roadmap). No agent may invent, round up, or reuse a stale
   figure as fresh. Unknown renders visibly as unknown.
2. **One writer per section** (table above). Conflicts resolve to telemetry's
   evidence, logged in `notes`.
3. **Schema changes** bump `version` and update this README in the same commit.
4. **Nothing secret, nothing personal.** The deck publishes to claude.ai:
   product status only — never keys, env values, or anything personal to
   Alberto. (Gitleaks runs on every commit regardless.)
5. **Same artifact URL forever.** Republish in place; never fork the deck to a
   new URL.

## Provenance

The seed `deck-data.json` was extracted from the hand-baked v1 deck (the
`lar-brain` overnight-build snapshot) so the contract starts true to what is
published. The first `deck-steward` run replaces it with a measured snapshot.
