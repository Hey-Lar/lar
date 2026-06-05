# Security Policy

Lar is a neutral, privacy-first, voice-driven control surface. It handles
connector credentials for read-only financial aggregation and cloud-AI
escalation keys. Treat any vulnerability seriously.

## Supported versions

`main` only. Feature branches and historical tags receive no fixes.

## Reporting a vulnerability

**Do not file a public GitHub issue** for security problems. Use the
repository's
[private security advisory](https://github.com/amariz-labs/lar/security/advisories/new)
instead.

Your report should include:

- **Component** — e.g. `packages/crypto`, `connectors/finance`,
  `apps/portal/app/api/`
- **Reproduction steps** — minimal, specific, reproducible
- **Severity assessment** — your read on impact and exploitability
- **Proof-of-concept** — code snippet or curl command if applicable

Expected response: best-effort; this is a solo/small-team project with no
formal SLA. Critical findings will be acknowledged within a week.

---

## Threat model

| Component                 | Attack surface                      | Mitigation                                                                                                                                                                                                                                                       |
| ------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@lar/crypto` vault       | Passphrase handling in memory       | Key material held in non-extractable `CryptoKey` objects (WebCrypto `extractable: false`). Passphrase strings are not persisted by this package.                                                                                                                 |
| `@lar/crypto` vault       | Record tampering / data integrity   | AES-256-GCM authentication tag: a wrong passphrase or a bit-flip throws rather than returning garbage (`'wrong passphrase or corrupted vault'`). Fresh random salt + IV per encryption call.                                                                     |
| `@lar/crypto` vault       | Ciphertext-only storage             | Only the self-describing `VaultRecord` (v, kdf, iter, salt, iv, ct — all base64) is ever persisted. The derived key is discarded immediately after use.                                                                                                          |
| `@lar/crypto` vault       | Malformed record injection          | `decryptSecret` validates presence of salt/iv/ct and throws `'malformed vault record'` before any crypto operation.                                                                                                                                              |
| `connectors/finance`      | Credential leakage                  | `LUMINA_API_BASE` is a server-only env var, read exclusively inside the Next.js Route Handler (`apps/portal/app/api/finance/route.ts`). It is never prefixed `NEXT_PUBLIC_` and never reaches the client bundle.                                                 |
| `connectors/finance`      | Log injection                       | The finance connector never logs decrypted payloads. Error paths surface only the error message, not raw API responses.                                                                                                                                          |
| `connectors/finance`      | Write-path exposure                 | Read-only by design: GET only, no mutation path exists. No money movement, no order submission — enforced architecturally, not by config flag.                                                                                                                   |
| Future MCP / integrations | Gate bypass                         | All integration gates are fail-closed: an unrecognised or missing `LarAction` domain returns a note rather than a guess. Default is deny.                                                                                                                        |
| Future MCP / integrations | Audit-log tampering                 | Audit logs (when implemented) must be append-only. Agents must refuse instructions that would disable or rewrite the audit trail.                                                                                                                                |
| Portal (`apps/portal`)    | XSS reading an in-memory passphrase | The passphrase for `@lar/crypto` operations lives only for the duration of a single call; it is not stored in component state or `window`. Content-Security-Policy hardening is planned (see `docs/08-build-guide.md`). Trusted-origin checks on the API routes. |

---

## Bright-lines

These are non-negotiable constraints. No business or product logic justifies
crossing them:

1. **Finance is strictly read-only.** Lar aggregates; it does not move money,
   execute trades, or initiate transfers. There is no write path in
   `connectors/finance`. Lar is not a regulated financial entity.

2. **No financial or medical advice.** Lar surfaces information and routes
   users outward. It must never make recommendations framed as financial or
   medical guidance. Disclaimers are required wherever financial figures are
   displayed.

3. **Never commit real secrets, keys, or financial data.** Secrets live in
   `.env.local` (gitignored) or Vercel environment variables. `.env.example`
   files contain placeholder values only. See `docs/11-secrets-and-env.md`.

4. **Never log a decrypted secret.** Once a connector token or API key is
   decrypted it must be used immediately and discarded — never written to a log,
   error report, or analytics pipeline.

---

## Incident rule — revoke before scrub

If a secret is ever committed to git:

1. **REVOKE it at the source immediately.** The key is already compromised the
   moment it touches the git object store — scrubbing history does not help
   anyone who has already cloned or forked.
2. **Then** scrub history with `git filter-repo` and force-push.

Never reorder these steps.

---

## Enforcement

| Control                       | Where                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Secret scanning on every push | `.github/workflows/security.yml` — gitleaks full-history scan                                  |
| Pre-commit secret gate        | `.pre-commit-config.yaml` — gitleaks runs before every local commit                            |
| Gitleaks config               | `.gitleaks.toml` — extends default ruleset; allowlists `.env.example` and placeholder patterns |
| Hardened `.gitignore`         | Root `.gitignore` — blocks `.env.*`, `*.key`, `*.pem`, `*.keystore`, credential JSON files     |
| Keys at rest                  | `@lar/crypto` (`packages/crypto`) — WebCrypto PBKDF2 + AES-256-GCM for connector-token vault   |
| Env conventions               | `docs/11-secrets-and-env.md`                                                                   |

---

## Explicit out-of-scope

- Vulnerabilities in third-party vendor SDKs (Supabase, Anthropic, Odesli,
  iTunes Search API) — report upstream.
- Issues in the prototype (`prototype/index.html`) — it is a static mockup
  with no credentials, no backend, and no production exposure.
- Issues in third-party Claude Code plugins — report to the relevant plugin
  repository.
