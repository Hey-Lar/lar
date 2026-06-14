---
description: Build the portal (next build) and Chrome-MCP screenshot every tab, confirming theme vars resolve and there are no CSP violations. The first-class browser gate that catches what typecheck/test/review miss (the c38cb71 CSP lesson).
argument-hint: '(optional) specific tab(s) to focus, defaults to all'
---

# /verify-portal — build + browser-verify every tab

Prove the portal actually renders. Typecheck, tests, and code-review ALL passed
the `c38cb71` CSP regression that blanked every theme variable app-wide — only a
browser screenshot caught it. This command is that gate.

## Steps

1. **Build.** `npm run build --workspace=@lar/portal` (i.e. `next build`) — must
   be clean. Then serve precompiled: `cd apps/portal && npx next start -p 4200`
   (prod `next start` avoids the known cold-`next dev` nonce race). Start it in
   the background.
2. **Open + probe (Chrome MCP).** Navigate to `http://localhost:4200`. Run the
   theme probe in the page:
   `getComputedStyle(document.documentElement).getPropertyValue('--hearth')`
   → must be `#d98a2b` (not empty), and
   `document.querySelector('style')?.sheet !== null` → the theme `<style>`
   actually applied (the exact failure mode of `c38cb71` was `sheet === null`).
3. **Screenshot every tab.** Cycle each tab (Overview · Agenda · Weather · Places
   · Music · Podcasts · Books · Dictionary · Film & TV · Wealth · Markets ·
   Health · Connect — or the tab(s) in `$ARGUMENTS`). For each: confirm warm mesh
   - glass render, the `<Icon>` glyphs (no emoji/broken boxes), and the block's
     primary content paints.
4. **Console check.** Read the console — **zero CSP violations**. (The benign dev
   nonce-hydration warning + an extension's `data-fbscriptallow` are expected and
   are NOT failures.)
5. **Theme sweep.** Cycle theme dark → ember → light and confirm vars re-resolve
   and the live chart re-colors (the `MutationObserver` on `data-theme`).
6. **Report.** Per-tab pass/fail, the resolved `--hearth` value, "no CSP
   violations" confirmed, and a screenshot reference for each tab checked. Stop
   the server when done.

## Rules

- If the page renders unstyled, suspect the CSP nonce handshake first: a hard
  reload rules out the cold-start race; if it persists under `next start`, it's a
  real regression — escalate to the security subagent and do NOT pass.
- Read-only verification — no code edits here.
