---
description: Run the full proven increment loop — brainstorm → plan → build (TDD) → review (reviewer + security [+ designer if UI]) → fix → browser-verify → --no-ff merge → docs-scribe updates HANDOFF. The gate must be green before merge; push stays a separate human act.
argument-hint: "<increment goal, e.g. 'add a Translate Room (MyMemory, keyless)'>"
---

# /ship-increment — the loop that built every merge

Ship ONE increment end-to-end at the world-class bar. This is the proven loop
(subagent-driven-development → review → browser-verify → `--no-ff` merge → update
HANDOFF). Do the whole thing; only pause for a genuine credential gate or a true
user-only decision.

**Increment goal:** $ARGUMENTS

## Loop

1. **Branch.** From `master`, create `feat/<slug>` (never build on `master`).
   Confirm `git branch --show-current`.
2. **Brainstorm (brief).** Restate the goal, the smallest end-to-end slice, and
   whether it is **UI** (decides the designer + browser-verify gates). Keep it
   tight — don't gold-plate.
3. **Plan.** Delegate to the **planner** subagent → a numbered plan in
   `docs/plans/<date>-<slug>.md` (critical files, risks, bright-line check, UI
   flag). Stop if the plan ends "Ready to build: no".
4. **Build, task by task (TDD).** For each plan task, delegate to the **builder**
   subagent: failing test first → minimal code → refactor. One task = one tight,
   scoped diff. Keep the gate green after each.
5. **Review each task.** Delegate to the **reviewer** (adversarial spec+quality,
   PASS/FAIL with file:line). Route FAILs back to the builder. Then the
   **security** subagent (the 4 bright-lines + secrets/CSP/authz) — a **BLOCK**
   stops the merge until cleared. If the increment is **UI**, also run the
   **designer** subagent.
6. **Browser-verify (if UI).** Via Chrome MCP: screenshot the affected tab(s),
   confirm `--hearth` resolves to `#d98a2b`, the theme `<style>` applied, and
   **no CSP violations** (the `c38cb71` lesson — UI changes MUST be browser-
   checked; build/test/review missed that bug). Re-verify the relevant themes.
7. **Gate, then merge.** Run the gate — `npm run typecheck && npm test &&
npm run lint` (and gitleaks via the pre-commit hook on commit). It must be
   **green**. Then `git checkout master && git merge --no-ff feat/<slug>`.
   Use `git -c user.name="Amari" -c user.email="amari@heylar.ai" commit` with the
   CLAUDE.md footer. **Do NOT `git push`** — that stays a deliberate human act.
8. **Update continuity.** Delegate to **docs-scribe** to update `HANDOFF.md`
   (Current state + Next increment) and any touched `docs/` **in the same
   increment commit**.
9. **Report.** What shipped, the merge commit SHA, the gate result, the
   browser-verify evidence (if UI), and anything you flagged for the human.

## Hard rules

- The gate is green before merge; never `--no-verify`, never disable gitleaks.
- All 4 bright-lines hold (read-only finance · no real secret/datum committed ·
  permissive licenses only · `@lar/ui`-only design, NEVER emojis).
- Smallest slice that fully achieves the goal; no unrelated changes in the diff.
- Push is NOT part of this loop. Stop after the merge + HANDOFF update.
