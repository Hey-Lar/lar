# Lar

**The guardian of your home.** — *"Hey Lar."*

Lar is a glassmorphic, AI-driven control surface for the home — built on Android (AOSP), not a from-scratch OS. It unifies your media, money, health, and home into one fluid, voice-driven interface where **you control the algorithm**, and where Lar routes you *outward* to the best place for each thing instead of locking you in.

> **Brand:** Lar · **Domain:** heylar.ai · **Wake word:** "Hey Lar"
> *(holding/dev domain: larorg.com)*

---

## Why Lar can exist

Every giant (Apple homeOS, Google Home, Amazon Alexa+, Samsung SmartThings) is building a home hub that pulls you *into* their walled garden — that's their business model. Lar is the opposite: a neutral, user-owned layer that sits *above* all the gardens, knows what's where, and routes you to the best one — with a voice agent that does multi-step actions across platforms that Siri/Alexa structurally can't.

**The defensible core:**
1. Cross-platform, user-controlled discovery & routing (music, film/TV, podcasts, books).
2. A voice agent ("Hey Lar") that does real multi-step actions across apps.
3. A neutral money + home + health dashboard that aggregates rather than captures.

---

## Repo map

| Path | What |
|---|---|
| [`docs/01-master-spec.md`](docs/01-master-spec.md) | Full ecosystem architecture — every block, OS/hardware, design system, integrations |
| [`docs/02-music-architecture.md`](docs/02-music-architecture.md) | Reference implementation: the brain → dispatcher → adapter pattern |
| [`docs/03-governance.md`](docs/03-governance.md) | Governance model + the bright-lines (read-only finance, no advice, no data sale) |
| [`docs/04-budget-roadmap.md`](docs/04-budget-roadmap.md) | €4k / 2-year phased budget (€1k now) + roadmap |
| [`docs/05-brand.md`](docs/05-brand.md) | Name, voice, domain, visual identity decisions |
| [`docs/06-stack-deployment.md`](docs/06-stack-deployment.md) | Tech stack + how each surface deploys (Next.js · Supabase · Kotlin) |
| [`docs/07-repo-structure.md`](docs/07-repo-structure.md) | Monorepo layout + when (and what) to split into separate repos |
| [`docs/08-build-guide.md`](docs/08-build-guide.md) | **Phase 1 build playbook — hand this to Claude Code** |
| [`CLAUDE.md`](CLAUDE.md) | Auto-loaded Claude Code rules (stack, conventions, bright-lines) |
| [`prototype/index.html`](prototype/index.html) | **Phase 0 working prototype** — open in a browser |
| `design/` | Whiteboard exports, screenshots, mockups (drop yours here) |

---

## Quickstart

```bash
# clone, then just open the prototype
open prototype/index.html      # macOS
# or double-click the file
```

Tap the amber **mic** (bottom-right) to run the "Hey Lar" voice flow: wake → resolve → route to platform.

---

## Status

- [x] **Phase 0** — name, domain, voice identity, working glass prototype (4 blocks + Hey Lar demo)
- [ ] **Phase 1** — real voice (Web Speech API) + Odesli track resolution + deep-link out (the Music wedge)
- [ ] **Phase 2** — AOSP launcher + system media control + on-device intent model
- [ ] **Phase 3+** — Podcasts, Film/TV, Net Worth, Health; intelligence layer; hardware

See [`docs/04-budget-roadmap.md`](docs/04-budget-roadmap.md) for the full roadmap.

---

## The throughline

**One architecture reused everywhere · your own data as the moat · route users outward instead of capturing them.** That's the part the trillion-dollar incumbents can't copy without breaking their own business models.

---

*Proprietary & confidential. See [LICENSE](LICENSE).*
