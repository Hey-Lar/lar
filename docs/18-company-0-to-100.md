# 18 — Building the company 0→100 (well, from the start)

> How to take HeyLar from inception to a real company **with minimal irreversible
> mistakes** — compliance, risk, money, security, customer service, the legal
> wrapper. Privacy-first consumer OS · solo technical founder (EU/Ireland) ·
> pre-revenue · few hrs/week + agents.
> Research-backed (sources inline). Companion: [16 — Roadmap](16-roadmap-205-days.md) ·
> [17 — Autonomy](17-autonomy-and-governance.md).
>
> ⚠️ **Not legal/tax advice.** This is a synthesis of reputable sources. Confirm the
> Irish entity, GDPR specifics, and any 83(b)/flip timing with an **Irish solicitor +
> accountant** before acting.

---

## 🚨 The 5 things that would most hurt HeyLar if gotten wrong

1. **Premature scaling — the #1 statistical killer.** Startup Genome (3,200
   startups): ~74% fail from scaling before the model is validated; properly-scaled
   startups grow ~20× faster ([GeekWire](https://www.geekwire.com/2011/number-reason-startups-fail-premature-scaling/)).
   With agents it's tempting to over-build product + infra. **Don't.** Validate
   retention with a tiny cohort first. _(This is why the [roadmap](16-roadmap-205-days.md)
   stops at "trustworthy core", not PMF.)_
2. **The E2EE / "never monetize data" promise is your entire brand — and a one-way
   door.** If the key design is wrong or plaintext leaks, the brand is dead. A formal
   third-party crypto audit (Cure53 / Trail of Bits / NCC) of key generation,
   storage, protocol + an adversarial "no plaintext in DB/logs" test is **table
   stakes before real-user launch.**
3. **Founder vesting + IP assignment at formation.** Even solo: vest your own founder
   shares (4yr / 1yr cliff) and execute a full IP-assignment to the company. Missing
   vesting + unassigned IP are classic deal-killers and the hardest to retrofit
   ([YC: Co-Founder Equity Mistakes](https://www.ycombinator.com/library/LP-co-founder-equity-mistakes-to-avoid)).
4. **GDPR is mandatory from your first EU user, not "later."** It applies the moment
   you process an EU resident's data ([Usercentrics](https://usercentrics.com/knowledge-hub/gdpr-compliance-for-startups/)).
   For a privacy brand, privacy-by-design (Art. 25), data minimisation, and a 72h
   breach process aren't paperwork — they **are** the product.
5. **Don't over-engineer the legal/tax wrapper.** A Delaware C-corp is for **US-VC
   fundraising**; 73% of foreign founders make incorporation mistakes that surface
   12–18 months later ([M Accelerator](https://maccelerator.la/en/blog/startup-strategy/setting-up-a-delaware-c-corp-from-abroad/)).
   EU-based + pre-revenue + bootstrapping → an **Irish Ltd is likely right first**,
   and Ireland's R&D reliefs are unusually generous.

---

## 🗓️ Do-Now vs Do-Later

| Item                                                            | When                                             | Why / what it is                                                                                                                                                          | Irreversible mistake it prevents                          |
| --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Irish Ltd** (not DE C-corp yet)                               | **Now** (before contracts/Stripe/paid users)     | Limited liability + clean contracting vehicle; matches the EU data-residency story                                                                                        | Personal liability; wrong jurisdiction; later "flip" pain |
| **Founder vesting + full IP assignment**                        | **Now**, at incorporation                        | Vest your equity (4/1); assign all pre-existing + future IP to NewCo                                                                                                      | Unassigned IP = unfundable/unsellable                     |
| **GDPR core** (privacy policy, ToS, RoPA, legal basis, consent) | **Now** (before first signup)                    | Mandatory once you touch any EU personal data                                                                                                                             | Retrofitting privacy; regulator exposure; brand-fatal     |
| **DPAs with every processor** (hosting, email, analytics)       | **Now**, as you add each tool                    | Required for any third party touching personal data                                                                                                                       | Compliance gaps that block partners later                 |
| **Threat model (STRIDE) + "no plaintext" CI test**              | **Now** (design phase)                           | Cheapest to fix at design; assert DB/logs never hold plaintext on every build                                                                                             | Architectural flaws at 100× cost post-launch              |
| **`security.txt` + responsible-disclosure policy**              | **Now** (cheap)                                  | RFC 9116 at `/.well-known/security.txt`                                                                                                                                   | Hostile public 0-day with no intake path                  |
| **Business banking + bookkeeping**                              | **Now**                                          | Separate accounts; never commingle                                                                                                                                        | Tax/audit mess; pierced corporate veil                    |
| **Waitlist + 10–50 hand-recruited users**                       | **Now → 3mo**                                    | Do things that don't scale; delight them                                                                                                                                  | Building in a vacuum; no PMF signal                       |
| **External E2EE / crypto audit**                                | **~3mo**, before beta                            | Review key design + recovery flow                                                                                                                                         | Broken-crypto launch = unrecoverable brand damage         |
| **Pentest**                                                     | ~3–6mo, before staging launch                    | Auth, authz, API, tenant isolation                                                                                                                                        | Shipping exploitable access-control bugs                  |
| **R&D tax credit claim**                                        | First FY-end (~6mo+)                             | Ireland 2026: 35% credit + 12.5% deduction ≈ **47.5%** on qualifying R&D, cash-payable ([PwC](https://taxsummaries.pwc.com/ireland/corporate/tax-credits-and-incentives)) | Leaving large cash refunds on the table                   |
| **Cyber + Tech E&O insurance**                                  | First paid/B2B customer (~6mo)                   | ~$1M/claim typical start; often contractually required                                                                                                                    | Uninsured breach that bankrupts NewCo                     |
| **Real CS / support tooling**                                   | Later (paid scale)                               | Do support **yourself** first — best feedback there is                                                                                                                    | Premature CS hire = premature scaling                     |
| **Delaware C-corp "flip"**                                      | **Only** when raising US VC (later, maybe never) | Investors expect DE for preferred stock/option pool                                                                                                                       | Flipping too early = double tax/admin, no benefit         |

---

## 🚪 Irreversible-mistakes shortlist (the one-way doors)

- **Broken E2EE key design shipped to real users** — no recovery; brand-fatal.
- **Plaintext leaking into DB / logs / backups** — one breach ends a privacy company.
- **No founder vesting / unassigned IP at formation** — unfundable, hard to fix.
- **If you ever do a US C-corp: missing the 83(b) 30-day window** — strict, no
  extensions, courts reject late filings ([Carta](https://carta.com/learn/equity/stock-options/taxes/83b-election/)).
  File the day stock is issued.
- **Processing EU data with no lawful basis / no policy** — regulator + reputational
  risk for a privacy brand.
- **Premature scaling** (infra, paid acquisition, headcount) before retention is proven.
- **Commingling personal/company finances** — veil-piercing, tax chaos.

---

## 💳 Money: the EU-solo-founder-specific call

- **Use a Merchant-of-Record (Paddle / Lemon Squeezy), not raw Stripe, at first.**
  Selling subscriptions globally as a solo EU founder via Stripe means VAT
  registration, quarterly EU VAT returns, US sales-tax nexus, and ~$5–15k/yr in
  accounting. An MoR **legally sells for you** and handles all of it. Switch to Stripe
  near ~$50–100k MRR ([GlobalSolo](https://www.globalsolo.global/blog/stripe-vs-paddle-vs-lemon-squeezy-2026)).
  **This is the single biggest ops-time saver for your profile.**
- **Bootstrap as long as the model is unvalidated.** Raising before retention is
  proven _is_ premature scaling. Ireland's R&D credit (cash-payable) + 3-yr start-up
  corporation-tax relief (up to €40k/yr) extend runway **without dilution**.

---

## 🧰 Minimal tool stack (AI-native, near-$0 to start, brand-aligned)

| Need                      | Pick                                                 | Why it fits HeyLar                                                                       |
| ------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Product analytics + flags | **PostHog** (free tier, EU cloud, self-hostable)     | privacy-aligned                                                                          |
| Web analytics             | **Plausible** (EU, cookieless) over GA4              | _aligns with the brand_                                                                  |
| Errors / monitoring       | **Sentry** (free tier)                               | standard                                                                                 |
| Payments                  | **Paddle / Lemon Squeezy** (MoR) → Stripe later      | removes VAT/tax burden                                                                   |
| Docs / PM                 | **Notion or Linear** (one tool; don't sprawl)        | low overhead                                                                             |
| Privacy ops               | consent tooling **only if you actually set cookies** | a privacy-first app can often avoid most cookie-consent surface entirely — a brand asset |

---

## 🤖 On "AI builds the whole company" repos — verdicts (judged, not assumed)

Applying the rule _judge execution independently of the concept_:

- **`shawnpang/startup-founder-skills`** — ~50 markdown skills across 9 domains,
  single maintainer, ~147★, no releases. **Verdict: useful curated _checklists/
  prompts_, not an autonomous COO.** Its own legal skills disclaim "not a substitute
  for counsel." Mine it for structure; don't trust it on compliance.
- **`aravind-naidu/AI-Startup-Co-Founder`** — idea→validation→pitch "in under a
  minute." **Verdict: demo-ware.** Fine for a first-pass brainstorm; output is
  generic + unvalidated — the opposite of "do things that don't scale."
- **"AI departments" (CEO/CFO/COO agents)** — **Verdict: interesting org metaphor,
  unproven at running a real company.** Good for drafting; bad for irreversible
  decisions (legal, crypto, tax).
- **Macro reality check:** Gartner predicts **>40% of agentic-AI projects cancelled
  by end-2027**; ~42% show zero ROI from missing baselines. **Use agents for
  high-volume drafting + research with you as the human-in-the-loop gate; never
  delegate the one-way doors (E2EE design, IP, tax, GDPR sign-off) to an agent
  unreviewed.**

---

## 🎯 Bottom line

**Incorporate Irish Ltd now with self-vesting + IP assignment; treat GDPR + E2EE as
product, not paperwork; get an external crypto audit before real users; sell via a
Merchant-of-Record; and hand-recruit your first cohort before touching anything that
smells like scale.** Agents are leverage for drafting and research — the irreversible
decisions stay human-gated.
