# Local-only assets (git-ignored)

Files in this folder are **never committed** (privacy rule) — only this README is.

## Photorealistic living-room background

Drop an image here named exactly:

```
living-room.jpg
```

…and it becomes the background of the **Living room** scene (Settings → Background
scene → Living room), served at `/local/living-room.jpg`. It covers the built-in
stylized SVG room. If the file is absent, nothing is fetched and the SVG room
shows instead — so this is fully optional.

- Recommended: a wide (≈1920×1080+), calm, softly-lit interior so the glass tiles
  - text stay legible over it. Landscape, low-to-mid visual busyness in the upper
    half (that's where the dashboard tiles sit).
- Any format works if you also update the CSS reference, but `.jpg` at the exact
  name above needs zero code changes.
- It's served same-origin from `public/` — **no network fetch, nothing leaves the
  device**, consistent with Lar's privacy bright-lines.
