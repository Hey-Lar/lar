#!/usr/bin/env bash
# .claude/hooks/pre-commit-gate.sh
# ---------------------------------------------------------------------------
# Lar's fail-closed pre-commit quality gate.
#
# Wired as a Claude Code PreToolUse hook (see .claude/settings.json): any Bash
# tool call whose command contains "git commit" runs this script FIRST. A
# non-zero exit BLOCKS the commit — the gate cannot be talked around (CLAUDE.md
# security bright-line #1: "Refuse to disable the safety gate").
#
# It mirrors the CI gates (.github/workflows/ci.yml) + the pre-commit-config
# secret scan, so a leak or regression dies locally, before push:
#   1. npm run typecheck   (TypeScript strict, all workspaces)
#   2. npm test            (vitest across the monorepo via turbo)
#   3. npm run lint        (prettier --check)
#   4. gitleaks on staged  (secret scan; soft-skips if the binary is absent —
#                           the CI gitleaks job is the backstop)
#
# Fast-fail: the first failing step stops the run and prints which step failed.
# Idempotent: read-only checks only; it never mutates the tree or the index.
#
# Run manually on a clean tree (must exit 0):  bash .claude/hooks/pre-commit-gate.sh
# Note: the echoes below are CLI/operator output, NOT product UI, so the
# check/cross marks are fine here (the NEVER-EMOJIS rule governs the product).
# ---------------------------------------------------------------------------
set -euo pipefail

# Resolve the repo root from this script's location so the gate works no matter
# the caller's CWD (Claude Code agent threads reset CWD between bash calls).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

# Each step prints a clear failure line and aborts (set -e) on a non-zero exit.
run_step() {
  local label="$1"
  shift
  echo "── gate: ${label} ───────────────────────────────────────────"
  if ! "$@"; then
    echo "❌ gate failed at: ${label}" >&2
    echo "   Commit BLOCKED. Fix the failure above, then re-stage and retry." >&2
    echo "   Do NOT bypass with --no-verify (CLAUDE.md security bright-line #1)." >&2
    exit 1
  fi
}

echo "▶ Lar pre-commit gate — running typecheck · test · lint · secret-scan"

run_step "typecheck (npm run typecheck)" npm run typecheck
run_step "test (npm test)" npm test
run_step "lint (npm run lint)" npm run lint

# ---------------------------------------------------------------------------
# Secret scan on the STAGED changes only (matches the CI gitleaks job).
# `gitleaks protect --staged` scans what's about to be committed. If gitleaks
# is not installed locally we WARN but do not fail on the missing binary — the
# CI gitleaks gate (.github/workflows/security.yml) is the hard backstop. We do
# NOT soft-skip an actual finding: if gitleaks runs and reports a leak, the
# gate fails closed.
# ---------------------------------------------------------------------------
echo "── gate: secret-scan (gitleaks protect --staged) ───────────────"
if command -v gitleaks >/dev/null 2>&1; then
  if ! gitleaks protect --staged --redact --config .gitleaks.toml; then
    echo "❌ gate failed at: secret-scan (gitleaks found a staged secret)" >&2
    echo "   Commit BLOCKED. A real secret must NEVER be committed" >&2
    echo "   (CLAUDE.md bright-line #2). Remove it; real values live in" >&2
    echo "   git-ignored *.local.yaml / public/local/. Then re-stage." >&2
    exit 1
  fi
else
  echo "⚠ gitleaks not on PATH — skipping the LOCAL secret scan." >&2
  echo "  Install it (https://github.com/gitleaks/gitleaks) to scan pre-commit." >&2
  echo "  The CI gitleaks job remains the hard backstop; this is not a failure." >&2
fi

echo
echo "✅ gate passed — typecheck · test · lint · secret-scan all green."
exit 0
