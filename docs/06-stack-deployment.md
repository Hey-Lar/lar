# Lar — Stack & Deployment

Lar has **four surfaces** that share **one backend**, so one account controls everything from either a native app or the web.

```
                 ┌───────────────────────────┐
                 │   Supabase (shared)        │
                 │   Postgres · Auth · RLS    │
                 │   storage · edge functions │
                 └───────────┬───────────────┘
        ┌────────────┬───────┴───────┬──────────────┐
        ▼            ▼               ▼              ▼
 Marketing site   Web portal    Android app    AI orchestration
 (Next/Vercel)   (Next/Vercel)  (Kotlin/Play)  (edge fns → Claude API)
```

## The surfaces

| Surface                 | Stack                                           | Host              | Notes                                                                 |
| ----------------------- | ----------------------------------------------- | ----------------- | --------------------------------------------------------------------- |
| **Marketing site**      | Next.js + Tailwind + Framer Motion / Three.js   | Vercel            | The "wow" landing — go all-out on design                              |
| **Web portal**          | Next.js (React) — reuse the glass prototype     | Vercel            | Sign-in + see/control your home ("iCloud-lite")                       |
| **Backend / auth / DB** | Supabase (Postgres + Auth + Row-Level Security) | Supabase          | RLS = "your data is yours" enforced at the DB                         |
| **Android home OS**     | Kotlin + Jetpack Compose (native)               | Google Play       | Native required for MediaController / AccessibilityService / launcher |
| **AI orchestration**    | Serverless/edge functions → Claude API          | Supabase / Vercel | The conductor calls models as tools                                   |

## Why not Laravel

Laravel (PHP) is mature and fine, but Lar is React-flavored, AI-heavy, design-led, and needs a **native** Android app — PHP fits none of those especially well. **Next.js + Supabase (TypeScript)** is more cohesive with the React front-ends and AI tooling, and Supabase gives auth + RLS out of the box (huge accelerant for a solo founder). Use Laravel only if you strongly prefer PHP and want one all-in-one backend.

## One account, two front doors

The native Android app and the web portal both authenticate against the **same Supabase project**, so a user signs in on the web and controls the same home the app manages. That's the iCloud model — native app + web companion on one account.

## Workflow (Claude Code + GitHub + cloud)

1. Build locally with **Claude Code**.
2. Push to **GitHub** (this repo).
3. **Vercel** connects to the repo → auto-deploys marketing + portal on every commit (free CI/CD).
4. **Supabase** hosts DB/auth/API (generous free tier).
5. **Android Studio** (+ Claude Code) → publish via Google Play internal testing → production.

Almost entirely free-tier — fits the €4k budget (see `04-budget-roadmap.md`).

## Suggested monorepo layout

```
lar/
├── apps/
│   ├── marketing/     # Next.js landing
│   ├── portal/        # Next.js web portal (from prototype)
│   └── android/       # Kotlin / Jetpack Compose
├── supabase/          # schema, RLS policies, edge functions
├── packages/
│   └── shared/        # the structured-action contract, types
├── docs/
└── prototype/         # the current Phase 0 HTML (reference)
```

Vercel can deploy each `apps/*` Next.js project from its subfolder.

```

```
