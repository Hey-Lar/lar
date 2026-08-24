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

- **S1 — SHIPPED (16 hero actors).** Woodcutter, miller, shepherd, 3 sheep,
  fisherman, goose, baker, blacksmith, dog, 2 ducks, swing kid, roof cat,
  beehive bees, + owl (night). Ambient: butterflies, smoke, clouds.
- **S2 — villager generator (+~35).** A parts-kit (bodies × hats × tools ×
  palette tints) in `world-cast.js`; villagers spawned along paths/zones with
  roles (farmers, market folk, monks, guards, kids) and shared tip pools.
  Data-driven so each is unique without hand-drawing 35 SVGs.
- **S3 — livestock & wildlife (+~25).** Cow herd, pigs, goats, deer at the
  treeline, rabbits, ground birds; simple LOD (distant = fewer parts).
- **S4 — trades & festival (+~25).** Market stalls row, forge yard, bakery
  ovens, cart horse, maypole festival set; reaches ~100 with zone-based
  interaction (click a stall, the stallkeeper answers).

Rule for every stage: get the design right first — a stage ships only after
the wide-composition check passes in the browser at desktop width.
