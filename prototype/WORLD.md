# The Lar World — Pastoral Flat Cartoon civilisation

Style bible: flat 2D storybook, thick uniform #141414 outlines, flat fills,
6-color palette (meadow #5DC152 / dark green #2F7D3A / brown #8B5A2B /
cream #F5EEDC / sky #9AD4F0 / accent #FFC94D + roof #C0522B), cel two-tone
shading only, blob shapes, no gradients in the artwork.

Interaction law: the world NEVER navigates (menus own navigation). Clicking a
character triggers its reaction animation + a comic speech bubble carrying a
pastoral finance tip. The sky engine (open-meteo weather, NOAA sun math,
seasons, geolocation) drives ambience over the flat scene.

## Population stages (~100 unique characters)

- **S1 — SHIPPED, then RE-AUTHORED as the high vista (13 hero actors).**
  v1 (16 ground-level actors) read as childish with no depth; replaced by a
  1600×1000 high-vantage composition: four receding value-band ridges, castle
  with waving flags, S-curve river → stone bridge → drifting boat, six
  patchwork crop fields, far village with church clock, watermill + windmill,
  orchard, market stall. Comedy cast with real faces: sleeping monk, woodcutter,
  knight chased by a goose, pig fleeing the farmer, jester juggling, blacksmith,
  wizard fishing up a boot, goose, dog, + night owl. Depth by scale/overlap
  only, per the style bible. Wide-composition check passed at desktop width;
  verified on the iOS build (real-sky engine live: geolocated, clear, 20°).
- **S2 — SHIPPED (+35 generated villagers, 48 actors total).** Parts-kit
  generator (hat × tool × tint × idle-anim over the `p-vill` body) living in
  the page itself, not a sidecar — hand-placed positions for design control,
  runtime-combined parts. Four depth-band anchor groups (`vg1`–`vg4`) keep
  paint order = depth: 2 castle guards, 11 field farmers, 4 residents,
  2 friars by the church, 7 road walkers + a shepherd, 6 market shoppers,
  3 kids. Roles share TIPS pools via the same `.actor` delegation; `.vgen`
  redirects the hop animation to the inner group so the outer
  translate/scale transform survives. All fade at dusk (`daycast`).
- **S3 — livestock & wildlife (+~25).** Cow herd, pigs, goats, deer at the
  treeline, rabbits, ground birds; simple LOD (distant = fewer parts).
- **S4 — trades & festival (+~25).** Market stalls row, forge yard, bakery
  ovens, cart horse, maypole festival set; reaches ~100 with zone-based
  interaction (click a stall, the stallkeeper answers).

Rule for every stage: get the design right first — a stage ships only after
the wide-composition check passes in the browser at desktop width.
