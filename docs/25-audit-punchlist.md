# 25 · Audit punch list (deep multi-lens pass)

> Provenance: a 14-lens parallel audit of the codebase (correctness · tri-theme ·
> a11y · CSS/token consistency · motion · responsive · security · performance ·
> dead-code · test-gaps · async-states · TS-safety · privacy · docs-drift), each
> finding verified against the actual code by a synthesizer pass. 76 raw findings →
> the list below. **Human-gated items (auth/crypto/middleware/CSP/MCP) are DRAFT-ONLY**
> — the founder decides; agents don't auto-change them.

## ✅ Done (worked through across the session)

- **Nav rail scroll** — 16 tabs + chrome exceeded `100vh`, clipping the bottom controls; now `overflow-y:auto`.
- **Ask stale-fetch race** — the Room branch returned without aborting `/api/lar` → double card; aborts first.
- **Ask a11y** — error `role="alert"`, result cards `aria-live`, send-button name while loading, mic as a labeled toggle.
- **WealthBlock loads-forever** on a fetch error → real error state.
- **SpeechRecognition leak** (GlobalAsk + useAskLar) → stop + detach handlers on unmount.
- **Async states** — TranslateBlock abort-on-unmount; OverviewBlock agenda gated on `Array.isArray`; MarketsBlock malformed-payload guard (was throwing mid-render); AgendaBlock empty-state.
- **Dead CSS** — removed `.glass--clear` + `.ov-card-d` (grep-verified no consumers).
- **Theme-aware `--info` accent** added; the theme-broken blues (`#5168cd`/`#6c8cff`) + neutral fallbacks tokenized
  (NOT the audit's `--mesh-b`, which is a background token — verified `var()` resolves in SVG attrs on the target).
- **RememberBlock live digest** — the digest memos froze at mount on an always-on display; added a 60s `nowMs` tick. _(commit `5992ef3`)_
- **DESIGN.md** — deleted the stale duplicate `## 6`/`## 7` sections. _(commit `5992ef3`)_
- **`/api/finance` error leak** — the catch returned the upstream error detail to the client; now a generic message. _(commit `90ab1bb`)_
- **Tri-theme foreground blues** — `MarketsBlock` (`DRIFT_COLOR`/`SUCCESS_BAND`/`HOLDING_COLORS`),
  `AgendaBlock` (`#5168cd`) and `HealthBlock` (`#6c8cff`) frozen blues + the `#cdd6e4`/`#b0bac7`
  neutrals now route through a new theme-aware `--info` accent / `var(--ink-faint)`. _(commit `21fdb03`)_

## 🔧 Auto-implement queue (safe, confirmed — work through in passes)

- **P1 · tri-theme (remaining)** — `globals.css .avatar` gradient still uses frozen
  `#cdd6e4`/`#aeb9cc` literals → route through theme tokens. _(The MarketsBlock/AgendaBlock/HealthBlock
  blues were tokenized in `21fdb03`; only the avatar gradient is left.)_
- **P1 · a11y (remaining)** — `SettingsDrawer` is Escape-only → add a focus-trap keyed on open
  (focus close, trap Tab, restore to `.theme-btn`). _(The `AskBar .go`/`mic` labelling shipped in `448698f`.)_
- **P1 · performance (remaining)** — `OverviewBlock` 1s `setInterval` re-renders `<GlobalAsk>` every
  second → extract a `<Clock/>` child; `useAskLar.ts` type `d` + guard before `as TRes`; `HeroChart`
  hoist `readThemeColors` out of the per-bar map + mount the theme observer once.
  _(The `TranslateBlock` abort-on-unmount shipped in `c2c05b6`.)_
- **P2 · correctness (remaining)** — week caption `{history.length}w` (Overview + Wealth)
  → `length-1` _(review: confirm intended meaning first)_; `agenda-demo startOfLocalDayMs`
  uses server TZ → anchor to client local day; add guards in `dictionaryapi`/`odesli pageUrl`/`store backup env`.
  _(The `RememberBlock` `nowMs` tick shipped in `5992ef3`; the `/api/finance` generic-message catch in `90ab1bb`.)_
- **P2 · cleanup/tests/docs (remaining)** — delete dead code (`larPreset` in `tailwind-preset.ts`+`index.ts`
  _if truly unused — verify the Tailwind consumers first_, `QUICK.desc`, `'search'` in `registry.ts`);
  responsive tweaks (Weather grids, `.app`, `.ask input`); motion (`will-change` on `[data-open]` only,
  drop `stage-anim` will-change, scene-drift translate-only); add finance tests (`allocationSlices`/
  `normalizeSnapshot`/retirement-zero/contribution-untargeted) + music tests (intent thresholds,
  `pickPlatform` fallback); fix README/HANDOFF/DESIGN counts.
  _(The `.glass--clear`/`.ov-card-d` dead-CSS removal shipped in `7e16ab3`; the duplicate `DESIGN.md §6/§7` in `5992ef3`.)_

## 🔒 Draft-only — human-gated (founder review; agents do NOT auto-change)

These are **real, verified** findings touching the privacy/security bright-lines.

- **P1 · privacy — Google Fonts leak every load** (`layout.tsx` + marketing): Fraunces/
  Manrope load from `fonts.googleapis.com`/`gstatic.com` (allow-listed via `FONT_HOSTS`),
  leaking home IP/UA/timing on every paint. **Self-host the fonts + strip `FONT_HOSTS`.**
- **P1 · prod-bug — CSP `img-src` blocks book/film covers** (`middleware.ts:62`):
  `covers.openlibrary.org`/`upload.wikimedia.org` are blocked, so covers never render in
  prod. Don't just widen it (per-query intent leak) — **proxy via a same-origin
  `/api/artwork`, then `img-src 'self'`.**
- **P1 · correctness — MCP `buildZodShape()` drops `.refine()/.strict()`**
  (`services/mcp/src/server.ts:96`): unwraps `ZodEffects` to its inner shape, losing
  `GetBarsArgsSchema`'s `refine(to>=from)+strict()` at the MCP boundary; `from>to` is
  forwarded unchecked. **Register the full schema or re-`parse(args)` + a regression test.**
- **P2 · privacy — Apple artwork CDN leaks each media query** (`MusicBlock:63` +
  `PodcastsBlock:81`): `<img src="*.mzstatic.com">` tells Apple the home IP + which track
  resolved. **Proxy via `/api/artwork`, drop `mzstatic` from `img-src`.**
- **P2 · privacy — Weather sends full-precision home coords to Open-Meteo**
  (`api/weather/route.ts`): coarsen lat/lon to ~1 decimal, cap `q` length, disclose.
- **P2 · security — CSP review** (`middleware.ts`): `FETCH_HOSTS` advertises
  `api.song.link`/`itunes.apple.com` though only called server-side (drop); no `media-src`;
  `style-src 'unsafe-inline'` is needed by inline style attrs but re-permits `<style>` injection.
- **P2 · robustness — 2FA/StepUp discard `listFactors()` error**
  (`TwoFactorCard:35` + `StepUpChallenge:26`): a transient failure silently resets to
  "No authenticator found" — alarming on a 2FA control. **Surface the error first.**
- **P2 · security — MCP stdio-only boundary undocumented** (`services/mcp/server.ts`):
  a future HTTP/SSE swap has no auth/rate-limit/origin check. **Add docs + a build guard
  that fails if a non-stdio transport is wired without auth.**

_Audit note: the synthesizer dropped a false "AgendaBlock freezes at midnight" claim
(it already refreshes on a 30s interval) — the equivalent `RememberBlock` `nowMs` issue
is real and kept above. Verify the few "review first" items before changing user-facing numbers._
