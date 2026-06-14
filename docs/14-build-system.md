# 14 — How HeyLar gets built (the build system)

> Plain-language guide to how Claude Code builds HeyLar autonomously, at a
> world-class bar. Written for the founder — no code required to follow it.
> The machinery lives in `.claude/`; this doc explains what it does and why.

## The one-paragraph version

HeyLar is built by a small **team of AI agents** working inside **Claude Code**
(the app, not a raw API script). One agent plans, one builds, others review and
guard. Before any change is saved, an automatic **quality gate** runs the same
checks our CI does — and it **cannot be skipped**. Work happens in two repeatable
loops: **`/ship-increment`** (build one improvement end-to-end) and
**`/new-room`** (add a new capability tab). Nothing reaches the live site without
passing the gate and, for anything you can see, being checked in a real browser.

---

## Who runs the build: Claude Code, not the raw API

The build runs through **Claude Code** — the harness that enforces permissions,
runs the quality gate as a hook, and lets agents hand work to each other. We do
**not** drive the build from a raw API script: the API has none of the guardrails
(no permission rules, no pre-commit gate, no agent roles). The constitution for
all of this lives in `.claude/` in the repo.

---

## The agents (the build team)

Six specialists. Each has a narrow job, a clear "never," and knows the four
bright-lines. They live in `.claude/agents/`.

- **Planner** — turns a goal into a numbered, step-by-step plan (saved under
  `docs/plans/`). Names the files, the tests, and the risks. Writes no code.
- **Builder** — implements **one** step at a time, **test-first** (writes the
  test, sees it fail, then writes just enough code to pass). Keeps each change
  small and never touches unrelated code.
- **Reviewer** — the adversarial second pair of eyes. Checks the change is
  correct, well-typed, not duplicated, and that its tests are honest. Gives a
  plain **PASS or FAIL** with exact file + line.
- **Security** — the guardian of the merge. Enforces the four bright-lines plus
  secrets, security headers, and access rules. It can **BLOCK** a change, and a
  block is final until fixed. When unsure, it fails closed (blocks).
- **Designer** — anything you can see. Uses only the shared design system
  (`@lar/ui`) and our custom icons — **never emojis** — and **must check the
  result in a real browser** before calling it done.
- **Docs-scribe** — keeps `HANDOFF.md` and the docs accurate, **in the same save
  as the change**, so the next session resumes with zero loss.

---

## The quality gate (the part that can't be skipped)

Every save (`git commit`) automatically runs `.claude/hooks/pre-commit-gate.sh`,
which runs four checks **in order** and **stops at the first failure**:

1. **Typecheck** — the code is internally consistent (`npm run typecheck`).
2. **Tests** — every automated test passes (`npm test`).
3. **Lint** — formatting is consistent (`npm run lint`).
4. **Secret scan** — no password, key, or private data is about to be saved
   (gitleaks). If the scanner isn't installed locally it warns and lets the
   build's CI scanner be the backstop — but a real leak it finds **fails**.

If any check fails, the save is **blocked** with a clear message. This is wired
so it **cannot be talked around** — there is no "just this once." It mirrors
exactly what our CI runs on the server, so problems die on the laptop, not in
production. (It's enforced as a Claude Code "hook," and the permission rules in
`.claude/settings.json` also forbid the bypass flag and block reads of any real
secret file.)

---

## The two loops (how work actually happens)

### `/ship-increment` — build one improvement, start to finish

The proven loop that produced every merge so far:

> brainstorm → **plan** → **build (test-first)** → **review** (reviewer +
> security, plus designer if it's visual) → fix → **browser-verify** (if visual)
> → gate must be **green** → merge → **docs-scribe** updates HANDOFF.

One increment at a time, smallest useful slice, no unrelated changes.

### `/new-room` — add a new capability tab

A "Room" is a capability the user sees (Music, Weather, Books…); its "Door" is
the small package that routes the user **outward** to the best destination.
We've built this ~8 times, so it's a recipe: new connector package + a portal
block/tab + intent words + tests + a browser check — copying the existing
connectors (books / film / places / dictionary). Runs inside `/ship-increment`.

### Two more helpers

- **`/review-branch`** — run the reviewer + security agents on the current work
  without merging (a read-only second opinion).
- **`/verify-portal`** — build the site and screenshot every tab in a real
  browser, confirming the theme renders and there are no security-header errors.

---

## Why we always check the browser

A real bug once slipped through **typecheck, tests, AND code review** — a
security-header (CSP) mistake that quietly blanked every color and style across
the whole app. It was caught **only** by looking at the site in a browser
(commit `c38cb71`). Lesson, now a rule: **any visible change is checked in a real
browser before it ships.** That's what the designer agent and `/verify-portal`
are for.

---

## The four bright-lines (every agent enforces these)

1. **Read-only finance.** We never move money, place trades, or give financial/
   medical advice — we only show information.
2. **Never save or send a real secret or private datum.** Keys and real data live
   only in local, git-ignored files (`*.local.yaml`, `public/local/`).
3. **Only permissively-licensed outside code.** Restrictive (copyleft) tools may
   be _run_ as a separate program, never copied into what we ship.
4. **One design system, never emojis.** Every glyph is our own `<Icon>`; the look
   comes only from `@lar/ui`.

---

## In-session vs between-session work

- **In-session (today):** a person opens Claude Code and runs the loops above.
  Everything here — plan, build, review, gate, merge — happens in that session.
  **Pushing to GitHub stays a deliberate human action** (the agents don't push).
- **Between-session (later — NOT built yet):** a GitHub Action could let the
  fleet pick up and ship queued work automatically while no one is watching.

> **TODO (pending a founder decision — do NOT build yet):** the between-session
> GitHub Action is deliberately **not** created. It hinges on one question — _how
> much merge autonomy do we grant unattended agents?_ Until you decide that, no
> `.github/workflows/*.yml` for autonomous building is added. When you're ready,
> that's a separate, scoped increment.

---

## Where everything lives

```
.claude/
  settings.json              least-privilege permissions + the gate hook
  hooks/
    pre-commit-gate.sh        the 4-check quality gate (typecheck/test/lint/secrets)
    commit-gate-hook.sh       runs the gate on every commit; blocks on failure
  agents/                     planner · builder · reviewer · security · designer · docs-scribe
  commands/                   ship-increment · new-room · review-branch · verify-portal
docs/14-build-system.md       (this file)
```

That's the whole build system: a disciplined team, an unskippable gate, two
repeatable loops, and a browser check on everything you can see.
