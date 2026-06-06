# 12 — Deploy (Phase 3 runbook)

This file is the operational checklist for taking Lar from a local repo to a
production deploy. Phase 3 ships the platform's deploy hardening:
**per-handler authz seam**, **per-request nonce CSP middleware**, and **a
documented release/rollback flow**. The deploy targets in priority order:

1. **Vercel** (Web portal — `apps/portal`)
2. **Vercel** (Marketing — `apps/marketing`, once it lands)
3. **Android** (later phase — Tink + Keystore on top of `@lar/crypto`)

Read this end-to-end before running anything.

---

## A · Pre-deploy local gates

Run each green before you push. These are the same gates CI will enforce.

```pwsh
# from C:\Users\Amari\Desktop\HeyLar.ai\Lar
npm install
npm run typecheck   # 16/16
npm test            # 16/16 workspaces, 60+ specs
npm run lint        # prettier --check
cd apps/portal && npx next build && cd ../..
```

**Staged-file privacy gate** (run before every push, require `clean`):

```pwsh
git diff --cached --name-only |
  Select-String -Pattern 'dashboard_data\.json|transactions\.json|master\.|\.key$|\.crt$|inbox/|first_readout|\.env\.local|\.pem$|\.p12$|\.jks$|\.keystore$' -CaseSensitive:$false
```

If anything matches: STOP. Real financial data, TLS keys, and signing
material never enter the repo. Real values live in git-ignored
`*.local.yaml` / `public/local/` / `.env.local`; commit only
`*.template.yaml` and `.env.example`.

---

## B · One-time account actions (require YOUR hand)

These need a confirmed `yes` because they create durable account state.
The agent will not perform them.

| Action                               | Command / UI                                     |
| ------------------------------------ | ------------------------------------------------ |
| Create the private GitHub repo       | `gh repo create lar --private --source . --push` |
| Add the Vercel project               | `vercel link` from `apps/portal` (Vercel CLI)    |
| Wire the GitHub → Vercel deploy hook | Vercel dashboard → Project → Git → Connect       |
| Add prod env vars (server-only)      | Vercel dashboard → Project → Settings → Env      |

After Step 1, every subsequent push to `master` runs the CI workflows
in `.github/workflows/*` — including the **fail-closed gitleaks secret
scan** (Phase 0) — before any deploy can happen.

---

## C · Environment contract (production)

All secrets in Vercel environment variables, **server-only**. Never
`NEXT_PUBLIC_*`, never logged decrypted. The full naming convention is in
[`docs/11-secrets-and-env.md`](./11-secrets-and-env.md).

| Var                     | Scope   | Purpose                                       | Required |
| ----------------------- | ------- | --------------------------------------------- | -------- |
| `LUMINA_API_BASE`       | server  | Real net-worth source (else demo snapshot)    | optional |
| `LAR_ANTHROPIC_KEY`     | server  | Cloud-escalation in `/api/lar` low-confidence | optional |
| `LAR_KILL_SWITCH`       | server  | `1` = every `/api/*` returns 503 + header     | optional |
| `SUPABASE_URL`          | server  | Once sign-in lands                            | future   |
| `SUPABASE_SERVICE_ROLE` | server  | Once sign-in lands                            | future   |
| `NODE_ENV`              | runtime | Vercel sets `production`; middleware reads it | auto     |

**Copy `apps/portal/.env.example` → Vercel env**; never copy a `.env.local`
into the dashboard by hand.

---

## D · Deploy flow

```
master HEAD               GitHub Actions               Vercel
─────────────────────────────────────────────────────────────────
git push origin master ─► CI (typecheck / test /  ──► auto-deploy
                            lint / gitleaks)         (Preview on PR,
                                                      Prod on master)
```

The CI gate sequence (each must pass):

1. `typecheck` — `npm run typecheck`
2. `test` — `npm test`
3. `lint` — `npm run lint`
4. `gitleaks` — fail-closed secret scan (Phase 0)
5. `npm audit --audit-level=high` — ignored for **moderate** (known
   dev-only chain: vitest/vite/esbuild + postcss-via-next; fixes
   require breaking-change downgrades and are unrelated to runtime
   exposure)

A red on any of 1–4 blocks the merge and the deploy.

---

## E · What's actually on the wire (verified)

Every Phase 3 protection in code as of `dab41a5`:

### Per-handler authz seam (`apps/portal/lib/authz.ts`)

- `authorize(req, { policy, allow })` runs at the **top of every
  `/api/*` handler**. Lives inside the handler (not just middleware) —
  defends against the March-2025 `x-middleware-subrequest` CVE shape
  (CVSS 9.1) where compiled Server Actions / Route Handlers bypass
  middleware authz.
- Today's default policy is `personal` (single-user read-only). The
  method allow-list is the bright-line: GET-only by default; `/api/lar`
  opts in to POST.
- `LAR_KILL_SWITCH=1` short-circuits every handler with 503 + the
  `X-Lar-Kill-Switch: 1` response header. Lets you take the surface
  offline without a redeploy.
- Future policies `session` / `token` / `origin` are fail-closed stubs
  — a typo (`policy: 'sesion'`) returns 401 instead of opening a
  silent door.

### Per-request nonce CSP (`apps/portal/middleware.ts`)

- `crypto.randomUUID()` → base64 nonce per request, attached as
  `x-nonce` on the incoming request (so `layout.tsx` can stamp it on
  the two inline tags Lar ships — `themeCss <style>` and the
  pre-hydration theme-boot `<script>`).
- CSP allow-lists scoped to the actual upstream surfaces Lar uses:
  Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`),
  `*.mzstatic.com` for iTunes/Apple Podcasts artwork,
  `api.song.link` for Odesli, `itunes.apple.com` for Music + Podcasts
  search.
- `script-src` has **no generic `'unsafe-inline'`** — only `'self'` +
  the nonce. (Dev mode adds `'unsafe-eval'` for HMR; prod strips it.)
- Other headers, all set by the same middleware:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=()`
    (mic stays on for the Music wedge's Web Speech API)
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-origin`
  - `Origin-Agent-Cluster: ?1`
  - `X-DNS-Prefetch-Control: off`
- `matcher` excludes `_next/static`, `_next/image`, `favicon.ico` so
  the long-cache pattern isn't broken by per-request headers.

### Client-side connector-token vault (Phase 0 / D6)

- `@lar/crypto` — WebCrypto AES-256-GCM + PBKDF2-600k. Ciphertext-only
  in localStorage; plaintext key + passphrase never persisted, never
  sent to the server. Documented in `docs/11`; UI is the **Connect**
  tab.

---

## F · Manual smoke after a deploy

From the deployed origin (e.g. `https://lar.vercel.app`):

```pwsh
# 1. Header check — every Phase 3 header present
curl -I https://<host>/
# expect: content-security-policy: ... 'nonce-<base64>' ...
# expect: strict-transport-security: max-age=63072000; ...
# expect: x-frame-options: DENY

# 2. Authz seam — method allow-list enforced
curl -X POST https://<host>/api/finance
# expect: 405 { "ok": false, "reason": "method-not-allowed", ... }

# 3. Kill-switch
# Set LAR_KILL_SWITCH=1 in Vercel env, redeploy, then:
curl -i https://<host>/api/agenda
# expect: 503 + x-lar-kill-switch: 1

# 4. Render — the Overview tab loads with no CSP-violation reports
# Open devtools → Console → Security tab → no CSP errors.
```

---

## G · Rollback

Vercel deployments are immutable. To roll back:

1. Vercel dashboard → Project → Deployments → choose the previous
   green deploy → **Promote to Production**.
2. Force kill-switch in the meantime if a security incident is
   suspected: Settings → Environment Variables → `LAR_KILL_SWITCH=1`
   → re-deploy (production). Every `/api/*` returns 503 and the
   client surfaces this — buys time to investigate without taking
   the marketing site down.

For repo-level rollbacks: `git revert <bad-merge>` on `master` and
push. The next CI run rebuilds; Vercel deploys the corrected `master`.

**Incident rule (canonical, copy of `SECURITY.md`):** _revoke at source
first, scrub second._ If a secret leaks: rotate the secret at the
upstream provider BEFORE running `git filter-repo` / force-push. The
repo is the second concern; the live credential is the first.

---

## H · Phase 3 status (as of `dab41a5`)

| Item                                       | Status                       |
| ------------------------------------------ | ---------------------------- |
| Per-handler authz seam                     | ✅ shipped (`7dc8cf0`)       |
| Nonce CSP + Nosecone-equivalent middleware | ✅ shipped (`dab41a5`)       |
| Deploy runbook (this file)                 | ✅ shipped                   |
| GitHub remote (`gh repo create lar`)       | ⏳ account action            |
| Vercel project + env vars                  | ⏳ account action            |
| GitHub Actions CI / gitleaks gate          | ✅ shipped earlier (Phase 0) |
| Android Tink + Keystore                    | ⏳ Phase 2 app               |

When you complete the two ⏳ account actions, push `master`. CI runs,
gitleaks scans the diff, the typecheck/test/lint/build gates run, and
Vercel deploys. Repeat for `apps/marketing` once it lands.
