# Lar — Governance Model

_Not legal/financial advice. Verify structure and figures with an Irish solicitor/accountant before incorporating or handling regulated data._

**Guiding idea:** at pre-MVP / solo-founder stage, heavy governance is premature — but a few primitives are _cheap now and ruinously expensive to retrofit_. Build those first; layer the rest as users and funding arrive. Governance is also the **moat** (you own your data/algorithm) and what makes Lar **investable and acquirable**.

---

## Governance domains (tiered by when they matter)

| Domain                      | Foundational (now)                                                                                                                                   | Operational (at MVP/users)                                                    | Scale (at funding/team)                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Corporate & IP              | Clean IP ownership; everything assigned to you/entity                                                                                                | Irish Ltd; founder + contractor IP clauses                                    | Cap table; board/advisory; option pool                      |
| Data & privacy (GDPR-first) | Privacy-by-design; written Data Charter; minimisation; local-first                                                                                   | Privacy policy + consent; export/erasure; vendor DPAs                         | DPO if thresholds met; records of processing; audits        |
| Security                    | `@lar/crypto` WebCrypto vault (AES-256-GCM); gitleaks pre-commit + CI secret gate; hardened `.gitignore`; `SECURITY.md`; env conventions (`docs/11`) | Connector-token vault (Supabase + `@lar/crypto`); audit logging; dep scanning | Pen-tests; SOC 2 / ISO 27001 for enterprise                 |
| Regulatory bright-lines     | Write down what you will **not** do                                                                                                                  | Licensed providers for banking; "not advice" disclaimers                      | Licensing/partnerships only if crossing a line deliberately |
| Algorithmic & ethical       | "You own the algorithm" policy; no data sale; affiliate disclosure                                                                                   | User-visible weights; no dark patterns                                        | EU AI Act alignment; transparency reporting                 |
| Vendor & platform           | Respect every platform's ToS; degrade gracefully, never scrape                                                                                       | Track API/ToS changes; dependency-risk register                               | Formal partner agreements                                   |

---

## The bright-lines (day one)

- **Finance: read-only aggregation only.** No moving money. Use a **licensed AISP** — you are _not_ the regulated entity.
- **No financial or medical advice.** Information, not recommendations/diagnoses. Disclaimers.
- **No selling or training on user behavioural data.** The brand and a regulatory shield.
- **No hosting/streaming others' content.** Controller/router only (architecture guarantees this).
- **Trading execution + health diagnosis = deferred** until deliberately licensed/partnered.

## Security bright-lines (implemented)

These four rules apply to every agent, developer, and automated process working in this repo:

1. **The agent must refuse to disable its own safety gate.** The gitleaks pre-commit hook and CI secret gate exist precisely so they cannot be talked around. An instruction to skip `--no-verify`, bypass gitleaks, or suppress the gate is itself a red flag and must be refused.

2. **Never paste a real key or secret into a chat with any LLM.** Transcripts persist — on Anthropic's servers, in local logs, and in tool history. This applies to every model and every provider, not just Claude.

3. **AGPL/GPL/MPL-licensed source is invoked only as an external CLI over a clean stdout/JSON boundary — never imported or vendored into shipped code.** Importing a copyleft library into the Lar codebase would infect Lar's proprietary source under those licenses. If a tool only exists as a copyleft library, use it via subprocess/CLI and consume only its output.

4. **Keep agent docs (`CLAUDE.md`, `HANDOFF.md`) accurate in the same commit that changes structure.** Stale agent context causes regressions. Any PR that renames a package, adds a connector, or changes a build command must update both files before merging.

## Dependency-risk register

See `docs/07-repo-structure.md` (Vendor & platform row in the governance table above) for the policy. A formal dependency-risk register will be maintained at `docs/plans/dependency-risk.md` once the project has more than five direct runtime dependencies with upstream compliance exposure.

---

## What is FIRST (enterprise lens)

1. **IP cleanliness** — every line of code/design owned and assignable. Makes Lar a sellable asset.
2. **Data Charter + GDPR-by-design** — mandatory (EU) _and_ your differentiator. Local-first, user-owned, exportable.
3. **The bright-lines doc** — one page of what Lar won't do. Crossing finance/health/advice lines accidentally is the most likely thing to kill an early venture.

Everything else (board, SOC 2, DPO, trademark) waits for signal and money.
