# Lar — Build Guide (Phase 1) · Claude Code Handover

This is the playbook to hand to **Claude Code**. Open Claude Code in the repo root and work the tasks **in order**. For each task: *Explore → Plan → Implement → Commit*. Respect `CLAUDE.md` and the bright-lines at all times.

**Phase 1 goal:** a deployed **web portal** where a user signs in, taps "Hey Lar" (or a mic), says *"play something calm on Tidal,"* and Lar resolves the track and deep-links out to the chosen platform — backed by Supabase auth + the user's own preference store. Plus a first **marketing landing page**. This is the Music wedge: the whole thesis, working.

---

## 0. Prerequisites (do once, on your machine)

- **Claude Code:** native installer (recommended) or `npm install -g @anthropic-ai/claude-code` (needs Node 18+). Requires a paid plan — **Claude Pro ($20/mo) is enough**; Max for heavy use. Run `claude` in the repo, authenticate.
- **Node 20+**, **pnpm** (`npm i -g pnpm`), **git**, **GitHub CLI** (`gh`).
- Accounts: **GitHub**, **Vercel**, **Supabase**, **Anthropic API key** (for orchestration).
- (Phase 2 only) **Android Studio**.

> Tip: run `/init` once to let Claude Code expand `CLAUDE.md` from the codebase, then keep this guide as the task list.

---

## 1. Create the repo + push (one repo for now)

```bash
cd lar
git init && git add . && git commit -m "chore: Lar foundation (docs, prototype, specs)"
gh repo create lar --private --source=. --push
```
**Create ONLY this one private repo now.** (Optionally `lar-android` later — see `docs/07`.)

---

## 2. Scaffold the monorepo (pnpm + Turborepo)

Ask Claude Code to:
- Add `pnpm-workspace.yaml` with `apps/*`, `services/*`, `packages/*`.
- Add Turborepo (`turbo.json`) with `dev`, `build`, `lint`, `typecheck` pipelines.
- Root `package.json` scripts proxy to turbo.
- Shared `tsconfig.base.json`, ESLint + Prettier, strict TypeScript.

**Acceptance:** `pnpm install` works; `pnpm dev` and `pnpm build` run (even if empty).

---

## 3. `packages/shared` — the action contract (the spine)

Define the structured action every surface speaks, with a zod schema + inferred type:

```ts
// packages/shared/src/action.ts
import { z } from "zod";

export const LarAction = z.object({
  intent: z.enum(["play","pause","next","queue","open","recommend"]),
  domain: z.enum(["music","podcast","film","book"]),
  entity: z.object({
    type: z.enum(["track","artist","album","show","movie"]),
    query: z.string(),
    id: z.string().nullable(),          // ISRC / canonical id if known
  }),
  platform: z.enum(["auto","spotify","apple_music","tidal","youtube_music","soundcloud"]).default("auto"),
  modifiers: z.array(z.string()).default([]),
  targetDevice: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0),
});
export type LarAction = z.infer<typeof LarAction>;
```

**Acceptance:** importable from other packages; `LarAction.parse(...)` validates.

---

## 4. `services/supabase` — auth + the user's data (RLS-first)

- Create a Supabase project; store URL + anon/service keys in env (gitignored).
- Schema (SQL migration):
  - `profiles` (id → auth.users, display_name)
  - `preferences` (user_id, platform_priority jsonb, weights jsonb)  ← "you own the algorithm"
  - `play_history` (user_id, entity jsonb, platform, action, created_at)  ← your recommendation training data
- **Enable Row-Level Security on every table**, policy: a user can only read/write rows where `user_id = auth.uid()`. (This is the privacy bright-line, enforced at the DB.)

**Acceptance:** RLS on; a user cannot read another user's rows; keys only in env.

---

## 5. `apps/portal` — Next.js web hub + sign-in

- `create-next-app` (App Router, TS, Tailwind) inside `apps/portal`.
- Add Supabase auth (email magic-link or OAuth). Protected dashboard route.
- **Port the glass prototype** (`prototype/index.html`) into React components: left rail, Home/Music/Wealth/Health blocks, the "Liquid-Glass-but-ours" look (frosted panels, amber hearth accent, fluid transitions). Reuse the design tokens; move shared bits to `packages/ui`.
- For Phase 1, only **Music** needs to be functional; others can stay as the styled prototype shells.

**Acceptance:** sign in → see the glass dashboard; refresh keeps session.

---

## 6. `packages/connectors/music` — resolve + route (no playing)

- **Resolver:** given a query/track, call the **Odesli/Songlink API** (`GET https://api.song.link/v1-alpha.1/links?url=...` — free, no key) to get the cross-platform link set. (Add a search step to turn a text query into a seed URL/ISRC; MusicBrainz can help.)
- **Deep-link builder:** from the link set, build the open-URL per platform.
- **Platform resolver:** pick the platform from `action.platform` (explicit wins) else the user's `preferences.platform_priority` ∩ availability.
- **Bright-line:** this module only resolves + builds links/launch intents. It NEVER streams or proxies audio.

**Acceptance:** given "play X", returns the correct platform open-URL honoring user preference.

---

## 7. "Hey Lar" voice → action → dispatch

- **Capture:** Web Speech API (`window.SpeechRecognition || window.webkitSpeechRecognition`) in a client component; wire to the mic. (Chrome desktop best; note browser support.)
- **Parse intent → action contract:** send the transcript to a **server action / Supabase Edge Function** that calls the **Claude API** with a system prompt like:
  > "You convert a spoken command into a single JSON object matching the LarAction schema. Output ONLY JSON, no prose. If platform unspecified, use 'auto'." (Provide the schema in the prompt.)
  Validate the result with `LarAction.parse`. Keep the API key server-side only.
- **Dispatch:** pass the action to `connectors/music` → get the open-URL → open it (deep link). Render the glass now-playing widget + the "Available on" row.
- Keep a deterministic fallback: if confidence low or parse fails, ask the user to confirm.

**Acceptance:** speak "play something calm on Tidal" → resolves a track → opens Tidal → logs to `play_history`.

---

## 8. `apps/marketing` — the landing page

- Separate `create-next-app` in `apps/marketing`.
- Goal: the "wow, this is the future" page — hero that lands the *lar*/hearth story, the cross-platform "available on" idea shown live, the glass aesthetic in motion, the anti-lock-in pitch, an email waitlist (store in Supabase).
- Can be built in parallel or right after the Music wedge. (Ask the assistant to design this — it's the design centerpiece.)

**Acceptance:** deploys to a public URL; waitlist captures emails.

---

## 9. Deploy

- Push to GitHub (already connected).
- **Vercel:** import the repo, create one project per `apps/*` (set the root directory to the subfolder). Add env vars (Supabase URL/keys, Anthropic key as server-only).
- Auto-deploys on every push.

**Acceptance:** marketing + portal live on Vercel; sign-in + voice flow work in production.

---

## Definition of Done (Phase 1)
- [ ] One private GitHub repo, monorepo scaffolded, CI deploy on push.
- [ ] Supabase auth + RLS; user owns their preference + history data.
- [ ] Portal: sign in → glass dashboard.
- [ ] "Hey Lar" voice → action contract → resolve (Odesli) → deep-link to chosen platform.
- [ ] Preferences honored; history logged (your recommendation seed).
- [ ] Marketing landing live with waitlist.
- [ ] No bright-line crossed: read-only, no advice, no audio hosting, keys server-side, no Spotify-data dependence.

---

## Then → Phase 2 (separate guide later)
AOSP/Android app in Kotlin: MediaController control of other apps, AccessibilityService fallback, on-device intent model, launcher. This is where you'll want real Android touch hardware (see chat / budget Tranche 2–3).
