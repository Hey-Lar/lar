# 17 — Autonomy & governance: the Fleet Steward + how far agents may go

> How autonomous the fleet can be **between sessions, day and night, without
> breaking anything** — and the meta-orchestrator ("the agent that creates agents
> and judges whether they're performing") that governs it.
> Research-backed (sources inline). Companion: [16 — Roadmap](16-roadmap-205-days.md).

---

## 🎯 The answer to "how autonomous can we be?"

**Maximally autonomous on reversible work; hard-stopped on the irreversible.**
Anthropic's own autonomy study found only **0.8% of agent actions are
irreversible**, and ~80% already have safeguards
([Measuring agent autonomy](https://www.anthropic.com/research/measuring-agent-autonomy)).
So _most_ work is safely automatable — but the irreversible 0.8% is **exactly** the
part that must stay human-gated. That is the whole design.

The cautionary tale we engineer against: a headless Claude Code run **burned $313 in
8.5 hours** stuck in a retry loop ([GH #57719](https://github.com/anthropics/claude-code/issues/57719))
— Claude Code has **no native cumulative spend cap.** We build one.

---

## 🏗️ Architecture: one context-owner + ephemeral subagents

We **reject** the "swarm of long-lived peer agents" pattern. Cognition's
[_Don't Build Multi-Agents_](https://cognition.ai/blog/dont-build-multi-agents)
shows peer swarms are **fragile**: context fragments, decisions disperse, agents do
redundant or conflicting work. (A forensic audit of **33,596 agent PRs** confirms
scope-creep and duplicate work are top failure modes — [Babu, Jan 2026](https://medium.com/).)

**Our model:**

- **One orchestrator owns the full context** for a unit of work.
- It **spawns _ephemeral_ subagents** for isolated, read-mostly subtasks (research
  fan-out, multi-file edits), which return and disappear.
- No long-lived collaborating peers. The framework barely matters; the **eval
  pipeline, observability, and failure-recovery** are what matter.

This matches Anthropic's orchestrator-worker pattern, which beat single-agent by
**+90%** on research tasks — but at **~15× the tokens**
([How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system)).
So we fan out **only** when work genuinely splits into independent parallel threads,
never by default.

---

## 🤖 The Fleet Steward (the meta-orchestrator you asked for)

A **persistent** agent (not a one-time setup) that **creates agents, scores them,
and retires/rewrites the underperformers.** Its spec lives at
[`.claude/agents/fleet-steward.md`](../.claude/agents/fleet-steward.md). It does four
things:

1. **Spawns** each agent from a versioned spec — system prompt + tool allowlist +
   permission mode + which gates it must pass. **One role = one file in git**, so
   every agent is reviewable and revertible.
2. **Scores** every agent run: **objective gates first** (did the increment pass
   _all_ of typecheck + test + lint + secret-scan + browser-verify + clean build?),
   then a rubric for the soft stuff (correctness-of-intent, scope discipline,
   repo-norm fit).
3. **Retires / rewrites** underperforming specs and **commits the diff** — so every
   change to the fleet is a reviewable, revertible PR.
4. **Reports weekly** to the founder: per-agent merge rate, gate-pass rate,
   cost/increment, and judge-vs-human agreement.

### Anti-sycophancy safeguards (mandatory — this is the part people get wrong)

LLM-as-judge has **documented, structural biases** that would quietly corrupt a
self-grading fleet:

- **Self-preference** — judges favor text in their own style/family
  ([arXiv 2410.21819](https://arxiv.org/abs/2410.21819)). A judge from the same
  model that _wrote_ the code is compromised by construction.
- **Position bias** ([arXiv 2406.07791](https://arxiv.org/abs/2406.07791)) and
  **sycophancy / shortcut bias** ([arXiv 2509.26072](https://arxiv.org/abs/2509.26072)).

So the Steward is bound by **five hard rules**:

1. **Objective gates outrank any LLM verdict.** A judge can **never approve over a
   red gate** — only flag soft issues. The gates (typecheck/test/lint/secret-scan/
   browser-verify/clean build) are an _objective_ rubric; lean on them hardest.
2. **Cross-family judging.** The judge must be a _different_ model family from the
   one that wrote the code. Use a **panel** of disjoint-family judges and aggregate
   ([Panel-of-LLM-judges](https://arxiv.org/abs/2404.18796) reduces familial bias at
   lower cost).
3. **De-identify + position-swap.** Strip "this is your own output" cues; swap A/B
   order and average — kills self-preference and position bias.
4. **Agent-as-a-Judge for trajectory.** For scope-creep / redundant-work that gates
   can't see, judge the _whole trajectory_, not just the final diff
   ([arXiv 2410.10934](https://arxiv.org/abs/2410.10934), ~90% human alignment).
5. **The Steward is never its own judge** and **cannot approve its own spec
   changes** — those escalate to the founder.

> Inspiration, not architecture: self-improving fleets (Darwin Gödel Machine,
> SWE-bench 20%→50%, [arXiv 2505.22954](https://arxiv.org/abs/2505.22954)) prove a
> meta-system _can_ improve its own agents — **but only where eval and
> self-modification align (coding).** We borrow the idea; we do **not** let the
> fleet rewrite itself unreviewed.

---

## 🪜 The tiered autonomy model (replaces "propose-only")

You said propose-only was too timid. Here is the upgrade — **far more autonomous,
still safe.** Each tier says what runs day+night unattended vs what needs you.

| Work class                                                                               | Autonomy                   | Required gates                                                                          | 🔴 Human checkpoint                       |
| ---------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------- |
| Docs, formatting, lint/CI fixes, dep bumps (lockfile-verified), test-only additions      | **Full auto, day + night** | build + typecheck + test + lint + secret-scan; **auto-merge on green**                  | None (post-hoc audit)                     |
| Feature code, refactors, UI (in `@lar/ui`), bugfixes                                     | **Auto + gated**           | all above + **browser-verify** + Agent-as-a-Judge (cross-family) + LOC cap → opens a PR | **Merge needs your approval**             |
| Schema / data migrations, public API, prod config                                        | **Auto-draft only**        | all above + dry-run / migration plan                                                    | **You review the plan before apply**      |
| **Auth · crypto · TLS keys · money · prod-deploy · data-deletion · real financial data** | **Human-only**             | hard hook-block; secret-scan must be `clean` (matches HARD RULES)                       | **You execute; the agent may only draft** |
| Fleet / agent-spec changes (Steward rewrites a role)                                     | **Auto-draft**             | versioned diff + score evidence                                                         | **You approve the spec diff**             |

This maps directly onto the forensic-audit finding: agents **excel at maintenance**
(docs, formatting, CI) and **fail at intent/foresight** ("plausible but wrong" code,
passing tests for buggy logic). So tier 1 runs free; everything with _intent_ in it
gets a human merge.

---

## 🛡️ The control plane (concrete, already partly built)

- **Sandbox by default.** Read-only allowlist is free; in-project edits are
  auto-approved (revertible via git); everything else is classified. _Honest limit:_
  Claude Code's transcript classifier has a **17% false-negative rate** on dangerous
  actions — **not** safe for high-stakes infra without human review. That's why the
  irreversible tier is hook-blocked, not classifier-trusted.
- **Enforcement = Agent SDK hooks** (`PreToolUse` to block, `PostToolUse`/`Stop` to
  audit) + permission modes. **Already live:** our
  [`.claude/hooks/commit-gate-hook.sh`](../.claude/hooks/commit-gate-hook.sh) +
  `pre-commit-gate.sh` (fail-closed typecheck/test/lint/secret-scan) and the
  `deny` list in [`.claude/settings.json`](../.claude/settings.json) (no `git push`,
  no `--no-verify`, no reading `*.local.yaml` / `public/local/` / `.env`).
- **Kill-switch:** a repo-variable flag that halts the fleet with no workflow edit.
- **Caps (all mandatory):** `--max-turns` loop cap + an **external spend ceiling**
  wrapping the orchestrator (Claude Code won't do this for us — the $313 loop) +
  concurrency limit + per-run LOC cap.
- **Branch protection:** agents push to feature branches; **auto-merge only on
  all-green**; agent branches are excluded from re-triggering CI (prevents fix-loops).

### What's built vs what's next

| Control                                                                 | Status                                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Fail-closed pre-commit gate (typecheck/test/lint/secret-scan)           | 🟢 **built** (`.claude/hooks/`)                       |
| `PreToolUse` hook + deny-list (no push / no secrets / no `--no-verify`) | 🟢 **built** (`.claude/settings.json`)                |
| Fleet Steward agent spec                                                | 🟢 **built** (`.claude/agents/fleet-steward.md`)      |
| External spend ceiling + kill-switch flag                               | 🔴 **next** (needs the between-session GitHub Action) |
| Cross-family judge panel wired into CI                                  | 🔴 **next**                                           |
| `claude.yml` between-session Action (day/night runs)                    | 🔴 **next** (gated on your tier-model approval below) |

---

## ✅ What needs you (decision)

**Approve this tiered model** (or adjust the lines). The moment you do, I wire the
between-session Action so the fleet starts running day+night within these guardrails.
The one thing I will **never** auto-run regardless of your answer: the **irreversible
five** (auth/crypto/money/prod/delete) — those stay human-executed, per your HARD
RULES and the 0.8%-irreversible principle above.
