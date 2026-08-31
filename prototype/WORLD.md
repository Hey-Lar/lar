# The Lar World — Lar Isle (isometric diorama)

**Style pivot (24 Aug 2026, user-directed):** the flat Pastoral Cartoon world
(98 actors, preserved at `prototype/backups/index-pastoral-98.html`) was
replaced by **Lar Isle** — a low-poly isometric floating-island diorama on an
indigo sky, in the reference style of Monument-Valley-meets-retro-gaming
dioramas. Characters are now **robot mascots**: cube heads with a rainbow
gradient rim around a dark faceplate, two glowing dot eyes, cream and matte
black variants (ChainGPT-mascot reference).

Interaction law (unchanged): the world never navigates; clicking an actor
plays its reaction and a comic bubble with a finance tip. The real-sky engine
(open-meteo, NOAA sun math, geolocation via the native bridge, seasons)
drives day/night: gradient background cross-fade, stars and moon at night,
robot eyes and the dungeon door glow after dark, clouds fade out.

## The isle

- Terrain: generated iso tiles (56/28/40 px grid), two tiers, checkered grass
  tops with rim highlights, cream cliff faces, slab underside, floating
  debris cubes, ground shadow.
- Props (all clickable, TIPS-wired): Game-Boy monument, hearts row, barrel,
  TNT + apple, coin arch, two apple trees, mushroom, blue well, inset pond,
  arched dungeon door (warm interior + glow at night), torch, lit windows
  (night), ladder, waterfall retired in favour of the pond.
- Robots b1–b5: door greeter (cream), console curator (black), barrel keeper
  (cream), compounding hero (black, front lawn), tiny USDC bot (cream).
  Idle hover-bob, head tilt, eye blink; wave + hop on tap.

## Hard-won rules

- CSS cannot animate inside `<use>` shadow trees — the robot symbol is
  inlined per instance at load.
- CSS animations override plain `opacity` rules: anything hidden by ambience
  state needs `visibility: hidden; animation: none` (the real-position sun).
- The page detects the iOS shell (`html.in-app`) and goes edge-to-edge with
  safe-area insets; web framing hidden.

Rule for every change: get the design right first — verify the composition
in the simulator (iPad Pro 13" is the working target) before shipping.

## Version ledger — 25 Aug 2026 marathon (staging on iPad Pro 13" landscape)

- v3 space-night: planet w/ city lights, ringed planet, satellite, aurora, denser stars;
  seasons + weather filters; lighthouse isle; house menu (nav+settings, bespoke icons);
  mic orb; calm clock (no seconds); UFO/balloon/fish/Game-Boy-blink; dev font menu.
- v4 unboxed console, tighter Connections, full-bleed body.
- v5 world pinned to the viewport (no bands, ever).
- v6 Sora bundled locally as the app face; greeting split from weather.
- v7 greeting enlarged; continuous CLLocation w/ retry.
- v8 Tasks view (self care moved out of Home); widget framework (max 5, Wealth first);
  observatory + garden isles.
- v9 Letterkenny default sky; v10 bare state-colored mic (idle/live/muted) + ruins isle.
- v11 ship-port isle w/ dockworker bot; iOS presentation everywhere.
- v12 all satellite isles rebuilt detailed multi-tile w/ mini bots (obs, space port,
  lighthouse, garden, ship port, ruins), hover-wobble not drift, world swipe-pan,
  console box gone, menu-breaking hoisting bug fixed.
- v13 floating left-rail house menu (collapsible to the icon), Apple-like widgets.
  App icon: miniature of the isle. Deck: reskinned to the night-isle palette.
