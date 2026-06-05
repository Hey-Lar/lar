# Lar — Master Architecture & Product Spec

Lar is a glassmorphic, AI-driven, voice-first control surface for the home, built **on Android (AOSP)**, not as a from-scratch OS. It unifies media, money, health, and home into one interface where **you control the algorithm**, and Lar routes you outward to the best place for each thing instead of locking you in.

---

## 0. Thesis

> Every giant builds a home hub that pulls you _into_ their walled garden. Lar is a neutral, user-owned layer that sits _above_ the gardens, knows what's where, and routes you to the best one — with a "Hey Lar" voice agent that does multi-step actions across platforms that Siri/Alexa structurally can't.

---

## 1. Positioning & the wedge

The incumbents want lock-in — that's structural, and it's the open lane. None will build "here are 10 places to go _instead of_ mine, ranked by your own preferences."

**Defensible core:** (1) cross-platform user-controlled discovery & routing; (2) a voice agent that does real multi-step cross-app actions; (3) a neutral money/home/health dashboard that aggregates rather than captures.

**What Lar is NOT:** a player (never hosts/streams others' content), a catalog scraper, or an ad network. It's the brain and the remote.

---

## 2. Competitive landscape

| Player          | Has                                             | Why the lane stays open                                   |
| --------------- | ----------------------------------------------- | --------------------------------------------------------- |
| Apple           | homeOS + HomePad hub (2026), presence detection | No third-party app store; Apple-Music-only; walled        |
| Google          | Home app + aging Nest Hub + Gemini              | Ecosystem capture, not neutrality                         |
| Amazon          | Echo Show + Alexa+                              | Commerce + lock-in motive                                 |
| Samsung         | SmartThings + Family Hub                        | Hardware-tied, Tizen                                      |
| Home Assistant  | User-controlled dashboards                      | DIY, not consumer-polished — _study it, win its audience_ |
| Odesli/Songlink | Cross-platform link resolution                  | Link tool only; single-domain; no agent, no hub           |

The gap nobody owns: a **polished, consumer, multi-domain, user-controlled discovery + control OS.** That's Lar.

---

## 3. Foundation: OS + hardware

**Do NOT build a custom OS.** Build on **AOSP** as a **custom launcher + app suite** — the "live OS within Android" feel without a kernel, and (unlike iOS) the ability to actually control other apps (MediaController, AccessibilityService).

**Hardware path:**

1. **MVP:** fullscreen web app on a cheap Android tablet / mini-PC behind any touchscreen. Prototype in days with Claude Code.
2. **Product:** AOSP launcher on a normal touchscreen panel (10–32").
3. **Flagship (later):** transparent OLED — reality check, LG's runs ~$60k; halo product only.

---

## 4. The universal architecture (every block reuses this)

```
  VOICE ("Hey Lar") / TOUCH
        │
        ▼
 ┌──────────┐   ┌────────────┐   ┌──────────────────┐
 │  BRAIN   │ → │ DISPATCHER │ → │ SERVICE ADAPTERS │
 │ (decide) │   │  (route)   │   │   (execute)      │
 └──────────┘   └────────────┘   └──────────────────┘
```

**Command hierarchy** (dispatcher walks down to the first rung that works for that service + user):

| Rung | Mechanism                                | Role                                         |
| ---- | ---------------------------------------- | -------------------------------------------- |
| 1    | Deep link                                | Launch to a thing — universal, free, instant |
| 2    | System control (Android MediaController) | Control whatever's running — no API needed   |
| 3    | Official remote/data API                 | Rich actions where access exists (auth/tier) |
| 4    | AI UI automation (AccessibilityService)  | Last-resort screen agent; brittle            |

**Orchestration:** a deterministic **conductor service** runs the system (state machine + event bus + scheduler + permission gate) and _calls models as tools_. The model proposes; the conductor's code validates and disposes. **A small on-device model** handles wake + common intents (instant, offline, free); a router escalates to a **cloud model** only for ambiguity, reasoning, and curation.

> Full detail: [`02-music-architecture.md`](02-music-architecture.md) — the reference implementation. Other blocks are "music block with different data sources."

---

## 5. The blocks

Each = same skeleton + (availability data) + (service adapters) + (deep links).

- **Home** — lights/climate/locks/scenes/weather, presence-aware. Backbone: **Matter** (+ optionally a Home Assistant engine).
- **Music** _(reference impl)_ — Odesli for cross-platform IDs; adapters per rung; never depend on Spotify data.
- **Film & TV** — JustWatch/Reelgood-style availability; deep-link to Netflix/Prime/etc.
- **Podcasts** _(easiest)_ — open RSS + Podcast Index; fully ownable.
- **Books & audiobooks** — Google Books/Open Library metadata; Kindle/Apple/Kobo/Audible/**Libby (library!)** links.
- **Net Worth** — open-banking aggregation (GoCardless Bank Account Data / TrueLayer / Plaid; brokerage via SnapTrade). **Read-only.**
- **Health** — Health Connect / HealthKit + wearables. **Local-first, private.**
- **Trading** _(custom)_ — brokerage APIs / SnapTrade. **Dashboard / read-only first.**
- **Shopping** _(custom)_ — price comparison + wishlist; disclosed affiliate.

---

## 6. Intelligence layer (the moat)

Cross-domain recommender on **your own data**, so no platform can switch it off: ListenBrainz (open listening signals), MusicBrainz / Open Library / Podcast Index (metadata), Odesli / JustWatch (availability), and the user's own interaction history in Lar. **User-controlled weights** (novelty vs familiarity, platform diversity, boost/exclude). The **subscription-archetype recommender** tells users which subscriptions are worth it / which to drop — deeply anti-lock-in.

---

## 7. Design system — "Liquid Glass, but ours"

Inspired by Apple's Liquid Glass (depth, refraction, light response) but a **distinct Lar signature** — not a clone (you're on Android; own your color temperature, geometry, motion). Warm **amber "hearth" accent** (the Lar, the household light), frosted panels, ~50% rounded, fluid spring transitions.

**Rendering-cost flag:** real-time glass is GPU-expensive (web: `backdrop-filter` + displacement maps; Android: `RenderEffect` + AGSL shaders). Budget performance early; ship a "reduced-glass" fallback tier.

---

## 8. Integration & automation layer

Three tiers, then the agent drives them:

1. **Native first-party connectors** — banking, media, Matter, Health Connect.
2. **Integration-platform bridges** — Zapier (breadth), Make (visual), **n8n (open-source, self-host = the "you own it" path)**. Lar is also a node _inside_ them.
3. **MCP (Model Context Protocol)** — every MCP server = a new capability the agent can call.

**Payoff = automation × agent × cross-block:** _"When net worth drops 5%, set focus lighting and draft me a summary."_ Lar becomes the home's automation brain.

---

## 9. Privacy & connectors

Local-first; on-device model + on-device stores for sensitive data (health, money, history). User-authorized connectors (Lar brokers, never harvests). **No ads, ever.** User can see/export their own preference data.

---

## 10. Business model

(1) Subscription for the intelligence layer + sync. (2) Disclosed affiliate/referral (subscription-archetype recs, where-to-watch/listen routing). (3) Hardware (later). (4) **Never ads.**

---

_See [`03-governance.md`](03-governance.md) for bright-lines and [`04-budget-roadmap.md`](04-budget-roadmap.md) for the roadmap._
