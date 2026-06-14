---
description: Run the reviewer + security subagents on the current branch's diff vs master — an adversarial spec/quality pass plus the fail-closed bright-line/secrets/CSP/authz gate. Read-only; reports PASS/APPROVE or FAIL/BLOCK with file:line. No edits, no merge.
argument-hint: '(optional) base ref to diff against, defaults to master'
---

# /review-branch — adversarial review of the current branch

Review the current branch against `master` (or `$ARGUMENTS` if a base ref is
given). This is a **read-only** gate — it finds problems, it does not fix or
merge them.

## Steps

1. **Establish the diff.** `git branch --show-current`, then
   `git diff <base>...HEAD` (base = `$ARGUMENTS` or `master`). Note the changed
   files and whether any are UI, finance, auth, CSP/middleware, env, or a new
   dependency (those raise scrutiny).
2. **Reviewer pass.** Delegate to the **reviewer** subagent: correctness against
   intent, behavior-preservation (byte-for-byte on refactors), DRY/Foundations,
   strict types, test honesty, scope. It runs the gate (typecheck/test/lint) and
   returns **PASS/FAIL** with `path:line` findings.
3. **Security pass.** Delegate to the **security** subagent: the 4 bright-lines
   (read-only finance · no real secret/datum committed · permissive licenses ·
   `@lar/ui`-only design, never emojis) + secrets scan (`gitleaks protect
--staged` if present) + CSP/nonce integrity (the `c38cb71` request==response
   nonce guard) + per-handler `authz`. Returns **APPROVE/BLOCK**.
4. **Synthesize.** Combine into one verdict: **ship / fix-then-ship / block**.
   List blocking findings first (file:line + required fix), then nits. State the
   gate result you observed and the secret-scan result.

## Rules

- Read-only: no edits, no commit, no merge. Routing fixes to a builder/designer
  is the human's or the ship-increment loop's call.
- A red gate, a dishonest/missing test, any bright-line crossing, or a CSP/authz
  regression ⇒ **BLOCK**. Fail closed on uncertainty.
