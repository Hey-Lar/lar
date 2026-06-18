# DESIGN.md — Lar design guidelines

The living design language for **Lar** (heylar.ai). Every visual decision in the
portal traces back here. We iterate on this doc; when an element is redesigned,
update the relevant section in the same commit.

> Synthesized from a 4-stream design research pass (glassmorphism · iconography ·
> motion · ambient backgrounds), then mapped onto Lar's real token system. Where
> research briefs referenced `@life-os/ui` / `--fg` / `--accent` / `theme.css`,
> those are the **old Lumina repo** (this session's CWD) — Lar's real system is
> `@lar/ui` → `packages/ui/src/themes.ts` (`themeCss()`), tokens below.

---

## 0. Philosophy

Lar is a **neutral, privacy-first, voice-driven control surface** — "the guardian
of your home" — that routes you _outward_ to the best place for each thing. The UI
must feel like a **warm, calm, premium control deck**: liquid glass over an ambient
scene, quiet until you ask, then fluid and responsive.

Five rules, in priority order:

1. **NEVER use emojis.** Anywhere. Every glyph is a custom stroke icon from the
   `@lar/ui` `<Icon>` set (§4). This includes tabs, the mic, weather conditions,
   the brand mark, badges — everything. An emoji in the UI is a bug.
2. **Glass is a material, not a fill.** Much more transparency + blur than a
   typical card, but always legible (§3). Never stack two full glass panes.
3. **Calm, then fluid.** The surface is still and uncluttered at rest; motion is
   smooth, brief, and purposeful when you navigate or ask (§5).
4. **The user owns the look.** Background scene, glass intensity, accent, motion,
   and theme are all customizable and persisted (§6).
5. **Privacy in the pixels.** No external asset/font/image fetches that leak
   intent; ambient scenes are CSS/bundled-SVG only.

Brand: warm amber **"hearth"** accent (`--hearth #d98a2b`) + teal secondary, over
a tri-theme system. The orange is an _accent_, not a wash — keep ambient orange
**subtle**.

---

## 1. Tokens (the real Lar system)

CSS custom properties are emitted per `[data-theme]` by `@lar/ui`'s `themeCss()`
into a `<style>` in `<head>` (pre-paint, no FOUC). `:root` in `globals.css` holds
only theme-invariant constants.

**Existing tokens** (`packages/ui/src/themes.ts`):
`--ink` `--ink-soft` `--ink-faint` · `--hearth` `--hearth-lo` `--hearth-glow` ·
`--teal` `--pos` `--neg` · `--body` · `--glass` `--glass-2` · `--stroke` ·
`--shadow` · `--mesh-base` `--mesh-a..d` · `--nav-idle` `--nav-active-bg`.
Invariant (`:root`): `--radius: 30px` · `--ease: cubic-bezier(0.22,1,0.36,1)`.

**The three themes** (note: _ember_ and _light_ are both LIGHT; only _dark_ is dark):

| theme | `--body`  | `--ink`   | character         | glass family               |
| ----- | --------- | --------- | ----------------- | -------------------------- |
| dark  | `#0e1116` | `#f0eee8` | Synex black, deep | white **low**-alpha glass  |
| ember | `#eef1f6` | `#26303c` | warm hearth light | white **high**-alpha frost |
| light | `#f4f6fa` | `#26303c` | cool stone light  | white **high**-alpha frost |

**New tokens to ADD** (this section drives the glass increment — add to each
palette in `themes.ts` + the `decls` array):

```
            dark                         ember (warm light)            light (cool light)
--glass            rgba(255,255,255,.06)  rgba(255,255,255,.55)         rgba(255,255,255,.55)
--glass-strong     rgba(255,255,255,.11)  rgba(255,255,255,.70)         rgba(255,255,255,.70)
--glass-tint       rgba(10,11,15,.10)     rgba(255,255,255,.10)         rgba(255,255,255,.10)
--glass-stroke     rgba(255,255,255,.12)  rgba(40,52,68,.10)            rgba(40,52,68,.10)
--glass-highlight  rgba(255,255,255,.26)  rgba(255,255,255,.85)         rgba(255,255,255,.85)
--glass-scrim      rgba(8,9,13,.30)       rgba(255,255,255,.55)         rgba(255,255,255,.55)
--shadow-1  0 1px 2px rgba(0,0,0,.20), 0 8px 20px -8px rgba(0,0,0,.40)   | ember/light: rgba(40,52,68,.06)/(.12)
--shadow-2  0 1px 2px rgba(0,0,0,.22), 0 12px 32px -8px rgba(0,0,0,.45)  | …(.07)/(.16)
--shadow-3  0 2px 4px rgba(0,0,0,.28), 0 24px 56px -12px rgba(0,0,0,.55) | …(.08)/(.20)
```

Invariant elevation filters (add to `:root`):

```
--elev-1: blur(12px) saturate(150%);   /* resting tiles, chips        */
--elev-2: blur(20px) saturate(165%);   /* rail, stage chrome          */
--elev-3: blur(32px) saturate(180%);   /* ask bar, popovers, palette  */
```

> Keep `--glass-2` as a transitional alias; migrate consumers to the named scale.

**Token ladders (shipped 2026-06-19, in `:root` — mirrored in `tokens.ts`):**

```
--r-sm 14 · --r-md 20 · --r-lg 28 · --r-xl 36 · --r-pill 999   (--radius aliases --r-xl)
--s1 4 · --s2 8 · --s3 12 · --s4 16 · --s5 20 · --s6 24 · --s7 32 · --s8 40 · --s9 48 · --s10 64
type (1.25 ratio): --t-display-hero clamp(2.6rem,5.2vw,3.8rem) · --t-display 46 · --t-h1 34 ·
  --t-h2 27 · --t-h3 21 · --t-body-lg 17 · --t-body 15 · --t-label 14 · --t-caption 13 ·
  --t-eyebrow 12 · --t-micro 11
motion: --ease (enter) · --ease-press cubic-bezier(.3,.8,.4,1) · --ease-ambient linear
--light-angle 145deg   (the single source the glass rim is lit from)
```

**Per-theme glass tokens (shipped values, re-lit pass):** fills are warm-tinted, not
pure white — ember `--glass rgba(255,248,238,.30)`, dark lifted to `rgba(247,242,235,.085)`
so panes don't vanish on `#0e1116`. The specular rim is dimmed (`--glass-highlight`
.66/.70/.34) and paired with a NEW bottom counter-light `--glass-rim-lo`. Added accent
`--hearth-hi #f6c878` (gold catch-light for CTA fills). Concrete elevation filters are
derived from `--glass-blur` (elev-1 = blur×0.6, elev-2 = blur, elev-3 = blur×1.6).

---

## 2. Color & contrast

- `--ink` body text, `--ink-soft` secondary, `--ink-faint` tertiary/labels.
- `--hearth` for the primary accent (CTAs, active nav, the brand mark, focused
  field). `--hearth-lo` is the gradient light-stop; CTAs use
  `linear-gradient(150deg, var(--hearth-lo), var(--hearth))` + white text.
- Contrast targets (measured against the _worst-case_ background a glass pane can
  sit over): body **4.5:1**, large/UI/icon strokes **3:1**. On very transparent
  surfaces, protect text locally (scrim or text-shadow, §3) rather than trusting
  the glass fill.
- Keyboard focus: `:focus-visible` → 2px `--hearth` outline + `--hearth-glow`
  halo. Pointer interactions get **no** ring/glow (keeps the deck clean).

---

## 3. Glassmorphism system

Apple "Liquid Glass" is a **material** with three optical layers (specular
highlight, separating shadow, adaptive tint) — not a single translucent rect.
Lar pushes transparency **far** but pays for every increase with a legibility
device.

### Principles

- **Elevation = blur + alpha + shadow, together.** Three rungs only; higher =
  more blur, slightly more opaque, larger softer shadow.
- **Never stack two full glass panes.** Glass lives on the _floating chrome_
  (rail, ask bar, tiles, popovers). The **stage is the quietest layer** (near-
  solid backplate) so tiles read as floating above it. A glass tile inside a
  glass stage inside a glass rail goes muddy instantly.
- **Always `saturate(150–185%)`** with the blur, or color averages to gray sludge.
- **Always add the edge:** a 1px hairline border (`--glass-stroke`) + a 1px inner
  top **highlight** (`--glass-highlight`) — without them the pane reads as a hole.
- Decorative fills stay `0.04–0.12` alpha on dark (clearer = more transparent);
  text-bearing panes use `--glass-strong`. On light themes, glass is _high_ white
  alpha (that's what makes frost read on a light page).

### The panel recipe

```css
.glass {
  position: relative;
  background: var(--glass);
  border: 1px solid var(--glass-stroke);
  border-radius: var(--radius);
  backdrop-filter: var(--elev-2);
  -webkit-backdrop-filter: var(--elev-2);
  box-shadow:
    inset 0 1px 0 0 var(--glass-highlight),
    /* specular top edge */ var(--shadow-2); /* layered float     */
}
.glass--clear {
  background: var(--glass);
  backdrop-filter: var(--elev-1);
}
.glass--frost {
  background: var(--glass-strong);
  backdrop-filter: var(--elev-3);
}

@media (prefers-reduced-transparency: reduce) {
  .glass,
  .glass--clear,
  .glass--frost {
    background: var(--body);
    backdrop-filter: none;
  }
}
```

### Legibility while very transparent

Decouple text contrast from the glass fill:

- **Scrim behind text** (preferred): a soft gradient under the text block only,
  `--glass-scrim`, `0.25–0.35` strength — keeps the pane clear while guaranteeing
  a backing for glyphs.
- **Text-shadow** for single lines/numerals over busy glass: dark themes
  `0 1px 2px rgba(0,0,0,.45)`; light themes `0 1px 1.5px rgba(255,255,255,.55)`.
- **Content-aware tint**: fold `--glass-tint` (a translucent `--body`) into the
  fill stack so even the clearest pane never drops below the contrast floor.
- **Subtle grain** (2–4% opacity, `mix-blend-mode: overlay`) on large frosted
  areas kills gradient banding. Above ~4% it _creates_ the dirty-glass look.

### Surface → treatment map

| surface                           | elevation     | fill                                       | filter     | notes                                                                                                                                                                  |
| --------------------------------- | ------------- | ------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Left rail**                     | elev-2        | `--glass`                                  | `--elev-2` | nav layer = correct place for glass. Active item is a solid-ish `--nav-active-bg` wash, **not** a 2nd pane. Right edge = brighter-at-top vertical hairline.            |
| **Main stage**                    | elev-1 / none | very low or `--body`                       | `--elev-1` | the quiet backplate; tiles float above it. Dense data/reading → drop glass to solid.                                                                                   |
| **Tiles / cards**                 | elev-1        | `--glass` (`--glass-strong` if text-heavy) | `--elev-1` | the floating objects — push transparency hardest here. Hover lifts blur 12→16px and `--shadow-1`→`--shadow-2` with a 1–2px translateY. Numerals get text-shadow/scrim. |
| **Ask bar**                       | elev-3        | `--glass-strong` + `--glass-tint`          | `--elev-3` | highest, frostiest — must stay legible while typing. Focus: brighten highlight + tighten `--hearth-glow` ring.                                                         |
| **Popovers / settings / palette** | elev-3        | `--glass-strong`                           | `--elev-3` | transient over arbitrary content → always frosted + scrimmed.                                                                                                          |

Rollout order: add tokens → upgrade `.glass` utility → promote rail/ask-bar/tiles
→ add text scrims (verify 4.5:1 on ember, the busiest) → add reduced-transparency
fallback + grain.

---

## 4. Iconography (NO emojis)

A cohesive, **original, stroke-based** line-icon set shipped as inline React SVG
from `@lar/ui`. Replaces every emoji/unicode glyph in the app.

### Spec

| property           | value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| viewBox            | `0 0 24 24` (draw at 240, export to 24)                                      |
| stroke-width       | **1.75** default (override per render; 2 next to bold text, 1.5 hairline)    |
| stroke             | `currentColor` — never a color prop                                          |
| fill               | `none` (one exception: active state may use low-opacity `currentColor` fill) |
| linecap / linejoin | `round` / `round`                                                            |
| vector-effect      | `non-scaling-stroke` (constant optical weight at 16/20/32)                   |
| live area          | 22×22 (1px edge padding); never touch the edge                               |
| keylines           | square 20×20 · circle ⌀20 · portrait 16×20 · landscape 20×16                 |
| corners            | 2px radius on boxy glyphs ≥8px (1px if <8px)                                 |
| spacing            | ≥2px between distinct strokes (don't merge at 16px)                          |
| optical centering  | by visual **mass**, not bounding box (nudge play/arrow right)                |
| markup             | only path/circle/rect/line/polyline/polygon; no transform/filter/style       |

### Component

A single registry component `<Icon name size strokeWidth direction title />`:

- `size` → width+height px (default **20**); color via `currentColor` (inherits
  `--ink`/`--hearth` from an ancestor `color`).
- `direction` rotates a single base glyph (chevron) via CSS — never a 2nd path.
- **a11y**: no `title` ⇒ decorative (`aria-hidden`, `focusable="false"`); `title`
  given ⇒ meaningful (`role="img"` + `aria-label` + `<title>`).
- Registry is **plain path-data** (tree-shakeable). Lives in
  `packages/ui/src/icons/{registry.ts,Icon.tsx}`, exported from the barrel.

### Glyph set (21)

`home, agenda, weather, places, music, podcasts, books, film, wealth, markets,
health, connect, dictionary, mic, search, settings, route` (arrow-up-right)`,
play, power, chevron, close` — plus weather sub-icons (clear, partly-cloudy,
cloud, fog, rain, snow, storm) for the Weather block, same spec. Glyph drawing
notes live in the icon-system implementation PR (drawn original to this spec;
Lucide ISC / Phosphor·Heroicons MIT are permissive fallbacks for tricky glyphs
with notice retained — SF Symbols is **reference-only**, never traced).

Settings uses **sliders** (tuning a control deck), not a gear. The mic (clean
capsule) is distinct from podcasts (mic + broadcast waves).

---

## 5. Motion & fluid navigation

**Zero new dependencies.** Lar's `--ease: cubic-bezier(0.22,1,0.36,1)` is already
the premium "easeOutQuint" curve. The whole system is CSS `@keyframes` on
`transform`+`opacity` (compositor-only — no layout/paint), re-fired by a React
`key`. (framer-motion is ~34 kB gzip for fade+slide+stagger — not justified;
revisit only if we add drag/swipe/interruptible springs. View Transitions API,
scoped to `.stage` only, is a future zero-dep upgrade.)

### Timing & easing

| motion                                                | duration                              | easing                                        |
| ----------------------------------------------------- | ------------------------------------- | --------------------------------------------- |
| tab content **enter** (fade + 10px rise + 1.5% scale) | 300ms                                 | `--ease` (easeOut)                            |
| element/result **enter**                              | 240–320ms                             | easeOut                                       |
| **exit** (if cross-fading)                            | 150–200ms                             | `cubic-bezier(0.4,0,1,1)` (faster than enter) |
| staggered tile reveal                                 | 300ms each, **30–38ms** between tiles | easeOut                                       |

Janky to avoid: linear easing; symmetric enter/exit; `ease-in-out` on appearing
content (use easeOut); >400ms tab swaps; animating `width/height/top/left/filter`
(layout thrash) — animate `transform`/`opacity` only; stagger >50ms/item.

### The three core animations (concrete)

```css
/* globals.css */
@keyframes stage-enter {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.stage-anim {
  animation: stage-enter 0.3s var(--ease) both;
  will-change: transform, opacity;
}

@keyframes tile-rise {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.ov-grid > .card {
  animation: tile-rise 0.3s var(--ease) both;
  animation-delay: calc(var(--i, 0) * 36ms);
}

@keyframes result-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.np {
  animation: result-in 0.32s var(--ease) both;
}
```

- **Stage swap**: wrap the conditional panels in `<div key={tab} className="stage-anim">`
  in `Dashboard.tsx` — changing `key` remounts the subtree so the enter animation
  re-fires on every tab change (and re-staggers the Overview tiles on re-entry).
- **Tiles**: pass `style={{ ['--i']: i }}` per `.ov-card` in `OverviewBlock.tsx`.
- **Result card**: `.np` already remounts per query; add `key` on a changed answer.

### Reduced motion (required)

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .stage-anim,
  .reveal,
  .np {
    animation: rm-fade 0.18s ease both !important;
    transform: none !important;
  }
  .ov-grid > .card {
    animation-delay: 0 !important;
  }
}
@keyframes rm-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

Keep a gentle opacity fade (vestibular-safe); strip all translate/scale; zero the
stagger delays.

---

## 6. Ambient backgrounds & customization

Replace the flat warm mesh (+ two strong blobs) with a small library of **bundled
"scenes"** that sit behind the glass and are user-selectable. **Privacy-first: every
scene is CSS / inline-SVG — no `<img>`, no network fetch.** A scene is a
`data-scene` value on one fixed `.scene-root`; a `.scene-scrim` wash sits over the
scene + under the glass to hold contrast steady as glows drift.

This is also the fix for the "too much orange / glowing cursor": the default scene
is calmer, ambient orange is **subtle**, and the **intensity slider** lets the user
dial it down further.

### Scenes (6)

| `data-scene`                | look                                                                                   | notes                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `calm`                      | 4 corner-anchored soft radial blobs over `--body`                                      | safest behind glass                                                                              |
| `hearth` _(default, brand)_ | calm base + warm conic "fire" bloom bottom-center + faint SVG mantel/window silhouette | the "guardian of your home" scene; glow is brand `--hearth-glow`, silhouette ink flips per theme |
| `dawn-skyline`              | 2-layer SVG city skyline (`<rect>` rows) over a dawn gradient + low sun                | near row gets a slow `sway`                                                                      |
| `deep-night`                | near-flat dark field + faint cool top glow + sparse star dots                          | highest glass contrast; best in dark                                                             |
| `aurora`                    | 3 tall blurred gradient ribbons drifting (`mix-blend-mode: screen` on dark)            | teal/amber/indigo; soften on light                                                               |
| `warm-mesh`                 | today's mesh + blobs, preserved                                                        | no regression for returning users                                                                |

Gradient discipline: 3–6 layered `radial-gradient()` (native mesh not shipped),
low alpha (0.25–0.6), outer stop `transparent ~50–55%`. `conic-gradient` only for
the small hearth bloom. Anchor glows to corners/edges; text-bearing cards sit over
the calmer mid-field. `mix-blend-mode: screen` only on dark/ember (washes out on
light).

### New per-theme tokens (add to `themes.ts`)

`--sil-far` `--sil-near` (silhouette inks) · `--scene-scrim` (legibility wash). E.g.
dark `sil-near rgba(255,255,255,.09)`, scrim `rgba(14,17,22,.34)`; ember/light use
`rgba(40,52,68,…)` inks + light scrims.

### Motion & performance

`contain: strict` + `position: fixed` on `.scene-root`; animate `transform`/`opacity`
only (never `background-position` or `backdrop-filter`); drift loops 30–80s (ambient,
not attention-grabbing); `will-change: transform` only on the 2–4 drifting layers.
Two motion gates: OS `prefers-reduced-motion` **and** a `data-motion="on|off|system"`
attribute the settings panel controls.

### Settings panel

A right-side **glass drawer** (`.glass--frost`, elev-3) opened from a **settings
icon** on the rail (next to the theme toggle). Controls, all applied instantly +
persisted (no Save button):

| control                                | effect                                                    |
| -------------------------------------- | --------------------------------------------------------- |
| Theme (3 swatches)                     | `data-theme` (reuses `lar-theme`)                         |
| Background scene (live thumbnail grid) | `data-scene`                                              |
| Scene intensity (slider)               | `--scene-intensity` → scales blob opacity + scrim + drift |
| Glass intensity (slider)               | `--glass-blur` (NN/g-recommended user contrast control)   |
| Motion (system/on/off)                 | `data-motion`                                             |
| Accent (optional)                      | `--hearth` override; default amber                        |

Scene picker = a swatch grid of live mini-previews (same scene CSS at small scale —
zero extra assets); selected = `--hearth` ring.

### Data model & pre-paint boot

`packages/ui/src/appearance.ts` (mirrors `themes.ts`): `SCENES`, `MotionMode`,
`Appearance { theme, scene, sceneIntensity, glassBlur, motion, accent? }`,
`DEFAULT_APPEARANCE { scene:'hearth', sceneIntensity:60, glassBlur:20, motion:'system' }`,
`coerceScene()`. Persist one JSON blob under **`lar-appearance`** (keep writing
`theme` through to `lar-theme` so `ThemeToggle` stays in sync). Extend the existing
pre-paint boot script in `layout.tsx` to set `data-scene` / `data-motion` + the two
CSS vars on `<html>` before first paint (allow-listed, CSP-nonce-safe — no FOUC).
Cross-tab sync via `storage` events, like the theme.

---

## 7. Changelog

- **2026-06-19 — premium design pass + round-2 critique (browser-verified, shipped).**
  Driven by a multi-agent recon (current code + world-class control-center / Liquid-Glass
  refs). Added the radius/spacing/type/motion **token ladders** (§1) + `--hearth-hi` /
  `--glass-rim-lo`; replaced the generic 4-blob scene with a **single directional light**
  - vignette + visible grain; **re-lit glass** in all three themes (warm-tinted fills,
    dimmed specular rim + bottom counter-light, dual-inset bevel; dark fill lifted so panes
    stop vanishing); bound **elevation to tier** (hero cards promoted, launcher chips flat
    at rest, rail receded to elev-1); frosted login; 3-stop hearth CTAs. Round-2 fixed real
    bugs: the listening-mic reduced-motion **strobe**, the `*:focus-visible` 6px **radius
    clip**, off-theme **ink shadows** on the result card, and `WealthBlock` **baked hexes**
    that bypassed the theme tokens; activated the inert route-arrow hooks; added an
    accessible ask **loading spinner**. `tokens.ts` synced as the RN source of truth.
- _init_ — philosophy, tokens, color, glass, iconography, motion, and ambient
  backgrounds/settings authored from the 4-stream design-research pass. Implements
  next as browser-verified increments: icons → glass → backgrounds+settings → motion.

---

## 6. Ambient backgrounds & customization

> _Pending research stream — to be filled (privacy-safe CSS/SVG "room" scenes,
> preset list, intensity, the settings panel + persistence). Placeholder._

Direction locked: replace the strong warm mesh with a tasteful ambient scene
(designed-room / silhouettes), **subtle** orange only, no external fetches,
user-selectable + persisted pre-paint (like the existing theme-boot).

---

## 7. Changelog

- _init_ — philosophy, tokens, color, glass system, iconography authored from the
  design-research pass; motion + backgrounds pending their streams.
