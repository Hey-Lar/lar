---
name: verify-increment
description: Run the HeyLar objective gate — typecheck, tests, lint (and build when app code changed) — and report PASS/FAIL with the failing step. Use after finishing any code change, before committing or opening a PR, or whenever asked to verify an increment is green.
allowed-tools: Bash(npm *) Bash(npx *) Read Grep
model: inherit
---

# Verify the increment (the objective gate)

This is Layer 1 of the [scoring rubric](https://github.com/Hey-Lar/mission-control/blob/main/governance/scoring-rubric.md):
the **objective gate is ground truth** — a red gate is a fail, full stop, and no LLM
verdict overrides it. Run every step, then report honestly.

## Steps (run in order; do not stop early — collect all results)

1. **Types** — `npm run typecheck`
2. **Tests** — `npm test`
3. **Lint / format** — `npm run lint`
4. **Build** — `npm run build` **only if** the change touches an app (`apps/portal`,
   `apps/marketing`) or anything bundled. Pure-package/test/doc changes can skip the
   slow app build (typecheck already compiled the packages).

## Reporting

- If **all pass** → report `✅ Gate GREEN` with the headline counts (e.g. "typecheck
  29/29, tests N, lint clean, build 9/9").
- If **anything fails** → report `❌ Gate RED at <step>`, paste the relevant failing
  output, and state exactly what needs fixing. Do **not** describe the increment as
  done, ready, or mergeable while the gate is red.

## Hard rules

- Never weaken or skip a step to make the gate pass. Never suggest `--no-verify`.
- If the change is observable in the browser (UI), note that **browser-verification is
  still required on top of this gate** (a green build has shipped broken UI before —
  the CSP/theming incident).
- This skill only reads + runs checks; it does not commit, push, or edit code.
