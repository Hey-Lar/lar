# 16 — The 205-day roadmap to production-ready staging

> Target: **production-ready _staging_ by 2027-01-01** (~205 days from 2026-06-14).
> Founder time ≈ a few hrs/week (decisions only); the agent fleet executes daily.
> Research-backed (sources inline). Companion docs:
> [17 — Autonomy & governance](17-autonomy-and-governance.md) ·
> [18 — Company 0→100](18-company-0-to-100.md) ·
> [15 — Honest status audit](15-status-audit.md).

---

## ⚖️ Reality anchor (read first)

"Staging" here is **not** a finished product and **not** product-market fit. It is:

> a **vetted, secure, demonstrable core** that a real user can trust — working auth,
> E2EE store with proven multi-device sync, **one** insanely-great core flow on
> mobile, passed an external security review, GDPR docs in place, deployed to a
> staging URL, with ≤50 hand-recruited beta users.

PMF ("explosive, destructive usage" — [YC, Real PMF](https://www.ycombinator.com/library/5z-the-real-product-market-fit)) is **explicitly past this window.** Trying to reach PMF by Jan 1 would mean premature scaling — the [#1 statistical killer of startups](https://techli.com/startup-genome-project/4187/) (~74% fail from scaling before the model is validated). We are building the **trustworthy core**, nothing more.

---

## 🧭 The critical path (the one line that can't slip)

```
one-way-door decisions  →  E2EE store + multi-device sync  →  core flow on mobile
   (wks 1-3, founder)        (wks 7-13, LONGEST POLE)          (wks 14-18)
        →  feature freeze  →  external security review  →  remediate  →  staging + beta
            (wks 20-23)         (wks 24-26)                 (27-28)       (29)
```

Everything else (marketing site, GDPR paperwork, the connectors we already have)
**parallelizes off the fleet** and is not on the critical path. Protect the critical
path; let the rest flow around it.

---

## 🏛️ The org: a "startup-pod" (human-thin, AI-thick)

The thesis is real and has data behind it: AI-native firms hit **~$1M–$4.7M
revenue/employee** vs ~$200–300K for traditional SaaS — roughly **10× output per
head** ([Dealroom](https://x.com/dealroomco/status/1914264599505018989): Midjourney
~$2M–$4.7M/head, Cursor $3.3M/head). The emerging model:
**founder = orchestrator, not individual contributor**; a meta-agent triages and
routes; specialized agents are the "units of ownership"
([HBR, "agent managers", Feb 2026](https://hbr.org/2026/02/to-thrive-in-the-ai-era-companies-need-agent-managers)).

**Honest caveat:** every cited unicorn still has 20–300 _humans_. Solo-founder +
agent-fleet is unproven at scale. So we treat agents as **force-multipliers on the
founder's judgment**, never replacements for it. The founder's few hours/week go
**entirely to the one-way doors** (below).

### The six pods

| Pod                              | The one outcome it owns                                                              | Founder's decision gate                                          | Agents staffing it                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Chief-of-Staff** (meta)        | Triage, route, summarize, surface only founder-gated items. _This is your leverage._ | —                                                                | **Fleet Steward** (orchestrator; see [doc 17](17-autonomy-and-governance.md)) |
| **Build** (core)                 | Ship the E2EE OS: auth → encrypted store + sync → mobile app                         | Approve architecture + crypto design (one-way); weekly PR review | planner + coder(s) + test/CI + reviewer                                       |
| **Design**                       | **One** insanely-great core flow + the design system                                 | Pick the _one_ aha-flow; taste/veto                              | UX-writer + UI-gen + token-keeper                                             |
| **Guardians** (privacy/security) | Threat model, key mgmt, audit-readiness, **no-data-leak gate**                       | Own the security model + audit go/no-go                          | threat-model + secret/dep-scan + audit-prep                                   |
| **Growth**                       | Marketing site, waitlist, beta narrative, first 50 users                             | **Personally** recruit the first users (can't delegate)          | copy + SEO + landing + social                                                 |
| **Ops / Compliance**             | GDPR (RoPA, DPAs, policy), infra, cost, monitoring                                   | Sign legal docs; approve subprocessors                           | legal-draft + compliance-checklist + infra/observability                      |

**The rule that governs everything:** agents own **reversible (two-way-door)** work
end-to-end; the founder reserves attention for **irreversible (one-way-door)** calls
— the crypto scheme, the data model, key-recovery UX, legal signatures, the public
launch ([Bezos one-way/two-way doors](https://fs.blog/reversible-irreversible-decisions/)).

---

## 📅 The schedule — 29 weeks, phase by phase

Dates assume Week 1 starts **Mon 2026-06-15**. Agents build daily; the **founder
column** is the only thing that needs _you_, batched into one weekly review window.

| Wk        | Dates                        | Phase / what ships                                                                                                                                                                      | 🔴 Founder gate (the only thing needing you)                                                                                    | Risk                                                |
| --------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **1–3**   | Jun 15 – Jul 5               | **Foundations & one-way doors.** Lock: encryption scheme, key-recovery UX, data schema, auth primitive, subprocessor list. Guardians write the STRIDE threat model.                     | **HEAVY.** Sign off the crypto/data design doc. _These are the highest-leverage weeks of the whole project — do not rush them._ | Rushing here = rework everything later              |
| **4–6**   | Jul 6 – Jul 26               | **Auth + skeleton.** Managed auth wired (1–3 days w/ Clerk-class), mobile scaffold, CI/test agent online, encrypted-store spike.                                                        | Approve auth choice + repo structure                                                                                            | low                                                 |
| **7–13**  | Jul 27 – Sep 6               | **E2EE store + multi-device sync** — the **CRITICAL PATH, longest pole.** Build on vetted crypto libs; key rotation, offline merge, no-data-loss tests. The schedule buffer lives here. | Weekly PR review; approve sync model                                                                                            | ⚠️ **#1 slip risk**                                 |
| **14–18** | Sep 7 – Oct 11               | **The core "aha" flow on mobile.** One flow, end-to-end, polished (Design + Build).                                                                                                     | **Gate: you complete the core loop on a real device** and it feels great                                                        | medium                                              |
| **16–19** | Sep 21 – Oct 18 _(parallel)_ | **GDPR + marketing site + waitlist.** Ops drafts RoPA/DPAs/policy; Growth ships landing + waitlist.                                                                                     | Sign the legal docs (~wk 17)                                                                                                    | low                                                 |
| **20–23** | Oct 19 – Nov 15              | **Harden + freeze.** Fix corner-cases, observability, secret-scan sweep. **Feature freeze.** **Book the external reviewer now** (lead time is weeks).                                   | Approve feature freeze; approve audit vendor + budget                                                                           | medium                                              |
| **24–26** | Nov 16 – Dec 6               | **External security / E2EE review** (~3–6 wks effort; scope tightly).                                                                                                                   | Audit go/no-go; fund it                                                                                                         | ⚠️ **#2 slip risk: findings can reopen the crypto** |
| **27–28** | Dec 7 – Dec 20               | **Remediate findings + re-test.** Real buffer, not optimistic filler.                                                                                                                   | Review remediation                                                                                                              | medium                                              |
| **29**    | Dec 21 – Jan 1               | **Staging cutover + closed beta** (10–50 hand-recruited users).                                                                                                                         | **You personally onboard the first users** ([PG: do things that don't scale](http://paulgraham.com/ds.html))                    | —                                                   |

### Velocity benchmarks the schedule is built on (cited)

| Phase                        | Real-world benchmark                                                                                                            | Source                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Auth (managed)               | hours → 1–3 days (Clerk); 2–5 days (Auth0)                                                                                      | [Clerk](https://clerk.com/articles/user-management-platform-comparison-react-clerk-auth0-firebase) |
| **E2EE + multi-device sync** | **The slow part.** No public month-count; hard due to offline devices, key rotation, no-data-loss. Don't roll your own ratchet. | [Cossack Labs / Bear](https://www.cossacklabs.com/case-studies/bear/)                              |
| Mobile (RN) MVP              | beta 3–6 wks; credible MVP 8–12 wks; w/ real-time sync 4–8 mo+                                                                  | [buildmvpfast](https://www.buildmvpfast.com/mvp-development-timeline)                              |
| External E2EE review         | Cure53 ~15 workdays (~3 cal wks); Trail of Bits ~6 cal wks; cost $5K→$100K+                                                     | [ChromaWay audits](https://blog.chromia.com/exec-summary-audits-and-hacknet/)                      |
| GDPR (lean startup)          | ~3–4 wks of work                                                                                                                | [Usercentrics](https://usercentrics.com/knowledge-hub/gdpr-compliance-for-startups/)               |

> **The single biggest schedule risk is _you_.** "If feedback takes 3 days instead
> of 3 hours, a 2-week project becomes a 6-week project"
> ([buildmvpfast](https://www.buildmvpfast.com/mvp-development-timeline)). A founder
> at a few hrs/week **is** that 3-day latency. **Mitigation:** one fixed weekly
> review window; pre-decide every one-way door in weeks 1–3 so agents never block
> waiting on you.

---

## ✅ Definition of done — "production-ready staging"

**Makes the cut:**

- Working auth.
- E2EE store with multi-device sync **proven** across offline / key-rotation / no-data-loss tests.
- **One** polished core flow on mobile.
- Passed an external security review (or findings remediated).
- GDPR docs in place (RoPA, DPAs, privacy policy, DSAR + 72h-breach process).
- CI/CD to a staging URL; monitoring/observability.
- Staging populated with ≤50 hand-picked beta users.
- A documented, tested key-recovery path.

**Intentionally deferred (NOT the bar for Jan 1):**

- Feature breadth beyond the one aha-flow.
- App-store production release + scale infra.
- Full PMF (post-window — needs "explosive usage").
- Paid/scaled marketing.
- SOC 2 / formal certs, multi-region, specialist hires.

---

## 🔭 What this means in one paragraph

The pretty 25% is done (see [audit](15-status-audit.md)). The next 205 days are the
hard 75%, and the order is **non-negotiable because of the critical path**: lock the
one-way doors → build encrypted sync (the long pole) → put one great flow on top →
freeze → get it audited → remediate → ship to staging with a tiny, hand-picked
cohort. Agents do the daily building; you spend your few hours/week only on the
decisions that can't be undone.
