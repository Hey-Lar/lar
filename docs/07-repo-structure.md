# Lar — Repository Structure

## TL;DR

**Start with ONE monorepo. Features are folders, not repos.** Multiple repos solve a _team coordination_ problem you don't have yet, and they make cross-cutting changes (especially the shared action contract) painful for a solo founder. Organize with clean internal seams so you _can_ split later — split only when it pays off.

## The monorepo

```
lar/                          ← single GitHub repo (private)
├── apps/                     # deployable surfaces
│   ├── marketing/            # Next.js landing      → Vercel
│   ├── portal/               # Next.js web hub      → Vercel
│   └── android/              # Kotlin/Compose OS    → Google Play
├── services/
│   ├── conductor/            # orchestration: deterministic core + model routing
│   └── supabase/             # schema, RLS policies, edge functions
├── packages/
│   ├── shared/               # the structured-action contract, TS types, constants
│   ├── ui/                   # glass components + design tokens
│   └── connectors/           # one module per block
│       ├── music/
│       ├── film/
│       ├── podcasts/
│       ├── books/
│       ├── finance/          # read-only aggregation — cleanly ISOLATED module
│       └── health/
├── docs/
├── design/
└── prototype/                # current Phase 0 HTML (reference)
```

## Why monorepo (now)

- The **action contract** in `packages/shared` is consumed by web, Android, conductor, and the Zapier/MCP layer — trivial to share in a monorepo, duplicated/versioned hell across repos.
- Atomic commits across surfaces; one place for Claude Code to reason over.
- Independent deploys still work: Vercel deploys each `apps/*` from its subfolder; Android builds from its folder.

## Tooling

- JS/TS: **pnpm workspaces + Turborepo**.
- Android: a folder in the monorepo, **or** its own repo (see below).

## The one defensible early split

The native Android app's toolchain (Gradle / Android Studio) differs enough from JS that pulling `apps/android` into a separate **`lar-android`** repo is reasonable if the monorepo tooling gets in the way. Everything else stays together.

## When to actually go multi-repo (later)

| Trigger                                                           | Split out                           |
| ----------------------------------------------------------------- | ----------------------------------- |
| A team forms with independent ownership                           | the owned component                 |
| A component needs its own release cycle                           | that component                      |
| Regulated/sensitive code needs isolation + tighter access + audit | **`connectors/finance`** → own repo |
| You open-source a piece                                           | the SDK / n8n nodes / etc.          |

Build `connectors/finance` as a bounded module **today** so this split is a move, not a rewrite.

## Push it (from your machine, not from chat)

```bash
unzip lar.zip && cd lar
git init && git add . && git commit -m "Lar — Phase 0"
gh repo create lar --private --source=. --push
```

Then connect the repo to Vercel (auto-deploy on push). Claude Code on your laptop can do all of this for you — it has your GitHub auth.

```

```
