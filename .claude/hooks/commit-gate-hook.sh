#!/usr/bin/env bash
# .claude/hooks/commit-gate-hook.sh
# ---------------------------------------------------------------------------
# Claude Code PreToolUse hook adapter for the Lar quality gate.
#
# Wiring (.claude/settings.json): PreToolUse matcher "Bash" → this script.
# Claude Code passes the tool call as JSON on STDIN; the Bash command lives at
# `.tool_input.command`. We:
#   1. read that JSON from stdin,
#   2. detect whether the command is a `git commit` (no jq dependency — a plain
#      grep on the raw payload is robust and we deliberately avoid extra deps),
#   3. if so, run the fail-closed gate (pre-commit-gate.sh),
#   4. translate a gate failure into **exit 2** — the hooks contract: exit 2 is
#      a blocking error whose stderr is fed back to the agent and the tool call
#      (the commit) is BLOCKED. Any other command, or a passing gate, exits 0.
#
# This makes the commit gate impossible to talk around (CLAUDE.md security
# bright-line #1: "Refuse to disable the safety gate").
# ---------------------------------------------------------------------------
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Slurp the PreToolUse JSON payload from stdin.
PAYLOAD="$(cat)"

# Only gate actual commits. Match the raw JSON (the command string is embedded
# in `.tool_input.command`); this also matches `git -c … commit …` forms.
if printf '%s' "${PAYLOAD}" | grep -Eq 'git[^"]*commit'; then
  if ! bash "${SCRIPT_DIR}/pre-commit-gate.sh"; then
    echo "Commit BLOCKED by the Lar pre-commit gate (see failure above)." >&2
    echo "Fix the failing step, re-stage, and retry. Never pass --no-verify." >&2
    exit 2
  fi
fi

exit 0
