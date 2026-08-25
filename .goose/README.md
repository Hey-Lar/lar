# .goose/ — the deck fleet as model-agnostic Goose recipes

The same five roles that exist as Claude Code / Buzz agents in
`.claude/agents/` (`deck-conductor · deck-steward · deck-telemetry ·
deck-board · deck-publisher`), packaged as [Goose](https://github.com/block/goose)
recipes so they run **on any model** Goose is configured for — Anthropic,
OpenAI, Google, Ollama-local, anything with a Goose provider.

## Run

```bash
# the autonomous orchestrator (reads the Board, ships one increment, refreshes the deck)
goose run --recipe .goose/recipes/deck-conductor.yaml

# a targeted pass
goose run --recipe .goose/recipes/deck-steward.yaml     # full deck refresh
goose run --recipe .goose/recipes/deck-telemetry.yaml   # measure only (read-only)
```

Run from the repo root. No `settings.goose_provider/goose_model` is pinned in
any recipe — each run inherits whatever provider/model the local Goose is
configured with (override per-run with `GOOSE_PROVIDER` / `GOOSE_MODEL`).
The conductor and steward declare the others as `sub_recipes`, so Goose
orchestrates the fan-out natively — same shape as the Buzz side.

## Why this exists (the orchestration lineage)

- **docs/23-orchestration-builderbot.md** — Lar builds its agent layer on the
  Block `builderbot` primitives: ACP as the vendor-neutral agent protocol,
  action-engine semantics, worktree-style isolation, an MCP review plane.
  Goose is ACP-compatible and CLI-discovered, so these recipes are launchable
  from Builderbot's **Staged** sessions as well as headless `goose run`.
- **mission-control `governance/orchestration-models.md`** — the pattern
  playbook both sides follow: single context-owner by default; fan-out only
  when earned; evaluator–optimizer capped ≤3; judge panel for
  plausible-but-wrong risk; quarantine for untrusted content; every result
  routed through the tiered-autonomy gates.
- **docs/22-recon-learnings.md §3** — the tiered local/cloud escalation these
  recipes inherit by being model-agnostic: run them on a local model for cheap
  tier-1 passes, a frontier model for tier-2 increments.

## Parity rule (do not let the two sides drift)

`.claude/agents/deck-*.md` and `.goose/recipes/deck-*.yaml` describe the SAME
roles with the same MUSTs and hard stops. A change to a role touches **both
files in the same commit** — and per the fleet constitution, agent-spec
changes are always a PR Alberto approves, never a silent edit.

## Safety floor (identical to the Buzz side)

Whatever the model: the repo's pre-commit gate + gitleaks still run on every
commit; `FLEET_ENABLED` still gates unattended runs; the irreversible five
(auth · crypto · money · prod-deploy · data-deletion) stay human-only; nothing
pushes `master`; no recipe may read `*.local.yaml` / `public/local/**` /
`.env*` or paste a real secret anywhere — a transcript is a transcript on
every provider.
