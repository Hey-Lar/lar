# Lar — Governance Model

*Not legal/financial advice. Verify structure and figures with an Irish solicitor/accountant before incorporating or handling regulated data.*

**Guiding idea:** at pre-MVP / solo-founder stage, heavy governance is premature — but a few primitives are *cheap now and ruinously expensive to retrofit*. Build those first; layer the rest as users and funding arrive. Governance is also the **moat** (you own your data/algorithm) and what makes Lar **investable and acquirable**.

---

## Governance domains (tiered by when they matter)

| Domain | Foundational (now) | Operational (at MVP/users) | Scale (at funding/team) |
|---|---|---|---|
| Corporate & IP | Clean IP ownership; everything assigned to you/entity | Irish Ltd; founder + contractor IP clauses | Cap table; board/advisory; option pool |
| Data & privacy (GDPR-first) | Privacy-by-design; written Data Charter; minimisation; local-first | Privacy policy + consent; export/erasure; vendor DPAs | DPO if thresholds met; records of processing; audits |
| Security | Encryption; secrets manager; least privilege; never host others' content | Connector-token vault; audit logging; dep scanning | Pen-tests; SOC 2 / ISO 27001 for enterprise |
| Regulatory bright-lines | Write down what you will **not** do | Licensed providers for banking; "not advice" disclaimers | Licensing/partnerships only if crossing a line deliberately |
| Algorithmic & ethical | "You own the algorithm" policy; no data sale; affiliate disclosure | User-visible weights; no dark patterns | EU AI Act alignment; transparency reporting |
| Vendor & platform | Respect every platform's ToS; degrade gracefully, never scrape | Track API/ToS changes; dependency-risk register | Formal partner agreements |

---

## The bright-lines (day one)

- **Finance: read-only aggregation only.** No moving money. Use a **licensed AISP** — you are *not* the regulated entity.
- **No financial or medical advice.** Information, not recommendations/diagnoses. Disclaimers.
- **No selling or training on user behavioural data.** The brand and a regulatory shield.
- **No hosting/streaming others' content.** Controller/router only (architecture guarantees this).
- **Trading execution + health diagnosis = deferred** until deliberately licensed/partnered.

---

## What is FIRST (enterprise lens)

1. **IP cleanliness** — every line of code/design owned and assignable. Makes Lar a sellable asset.
2. **Data Charter + GDPR-by-design** — mandatory (EU) *and* your differentiator. Local-first, user-owned, exportable.
3. **The bright-lines doc** — one page of what Lar won't do. Crossing finance/health/advice lines accidentally is the most likely thing to kill an early venture.

Everything else (board, SOC 2, DPO, trademark) waits for signal and money.
