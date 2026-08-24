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
- **S3 — SHIPPED (+27).** Cow herd of four grazing the west clearing, three
  pen pigs behind split rails (front rail painted over them), goats on the
  band edges, three far sheep, three deer on the far ridge (they stay out
  after dusk, with the rabbits), four foreground rabbits (hop cycle), five
  pecking hens, a field crow, and a scarecrow whose crow flies off when
  clicked. LOD per the plan: distant animals are the bare symbol, small.
- **S4 — SHIPPED (+23, 98 actors total).** Maypole with four ribbon colors
  and four flower-crowned dancers (dance cycle), bunting line, lute + drum
  musicians, hay cart with nodding horse, three p-stall market stalls
  (currentColor awnings: bread / greens / fish) with keepers and patrons,
  two drifting river ducks, and the forge cat on a barrel. Every S4 actor
  answers through the shared TIPS pools. The civilisation stands at 98.

Rule for every stage: get the design right first — a stage ships only after
the wide-composition check passes in the browser at desktop width.
