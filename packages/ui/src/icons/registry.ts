/**
 * Lar stroke-icon registry — the single source of geometry for `<Icon>`.
 *
 * Every glyph is stored as **shape data** on a 24×24 grid (the same grid the
 * `<Icon>` component renders into). Shapes carry only geometry — never stroke,
 * fill, transform, or style — so the component imposes one cohesive optical
 * weight (1.75 stroke, round caps/joins, `vector-effect: non-scaling-stroke`)
 * across the whole family. See `docs/DESIGN.md` §4.
 *
 * Geometry is adapted from the permissively-licensed **Lucide** icon set
 * (ISC; portions MIT © Cole Bemis) — see `packages/ui/LICENSES.md`. Lucide is
 * authored on the same 24×24 round-stroke grid, so rendering its shapes through
 * our component converges them onto the Lar line family at our 1.75 weight.
 */

/** A single drawable shape. Geometry only — the component owns all paint. */
export type IconShape =
  | { tag: 'path'; d: string }
  | { tag: 'circle'; cx: number; cy: number; r: number }
  | { tag: 'rect'; x: number; y: number; width: number; height: number; rx?: number; ry?: number }
  | { tag: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { tag: 'polyline'; points: string }
  | { tag: 'polygon'; points: string };

const p = (d: string): IconShape => ({ tag: 'path', d });
const c = (cx: number, cy: number, r: number): IconShape => ({ tag: 'circle', cx, cy, r });

/**
 * The registry. Keys are the public `IconName`s; values are the ordered shape
 * list rendered into the 24×24 viewBox. Tree-shakeable plain data.
 */
export const ICONS = {
  // ── App / nav glyphs ─────────────────────────────────────────────────────
  home: [
    p('M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'),
    p(
      'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    ),
  ],
  agenda: [
    p('M8 2v4'),
    p('M16 2v4'),
    { tag: 'rect', x: 3, y: 4, width: 18, height: 18, rx: 2 },
    p('M3 10h18'),
    p('M8 14h.01'),
    p('M12 14h.01'),
    p('M16 14h.01'),
    p('M8 18h.01'),
    p('M12 18h.01'),
    p('M16 18h.01'),
  ],
  weather: [
    p('M12 2v2'),
    p('m4.93 4.93 1.41 1.41'),
    p('M20 12h2'),
    p('m19.07 4.93-1.41 1.41'),
    p('M15.947 12.65a4 4 0 0 0-5.925-4.128'),
    p('M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z'),
  ],
  places: [
    p(
      'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
    ),
    c(12, 10, 3),
  ],
  music: [p('M9 18V5l12-2v13'), c(6, 18, 3), c(18, 16, 3)],
  // Podcast: broadcast waves + a stroked centre dot (no per-shape fill, so the
  // dot is a small stroked circle rather than Lucide's filled teardrop).
  podcasts: [p('M16.85 18.58a9 9 0 1 0-9.7 0'), p('M8 14a5 5 0 1 1 8 0'), c(12, 11, 1)],
  books: [
    p('M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20'),
  ],
  dictionary: [
    p('M12 7v14'),
    p(
      'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
    ),
  ],
  film: [
    p('m12.296 3.464 3.02 3.956'),
    p('M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z'),
    p('M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
    p('m6.18 5.276 3.1 3.899'),
  ],
  wealth: [
    p('M13.744 17.736a6 6 0 1 1-7.48-7.48'),
    p('M15 6h1v4'),
    p('m6.134 14.768.866-.5 2 3.464'),
    c(16, 8, 6),
  ],
  markets: [p('M3 3v16a2 2 0 0 0 2 2h16'), p('m19 9-5 5-4-4-3 3')],
  health: [
    p(
      'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2',
    ),
  ],
  connect: [
    { tag: 'rect', x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 },
    p('M7 11V7a5 5 0 0 1 10 0v4'),
  ],
  // Locked private store (keyhole) — distinct from `connect`'s plain padlock.
  lock: [
    { tag: 'rect', x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 },
    p('M7 11V7a5 5 0 0 1 10 0v4'),
    c(12, 16, 1),
    p('M12 17v2'),
  ],
  // Translate / languages (Lucide-adapted).
  languages: [
    p('m5 8 6 6'),
    p('m4 14 6-6 2-3'),
    p('M2 5h12'),
    p('M7 2h1'),
    p('m22 22-5-10-5 10'),
    p('M14 18h6'),
  ],
  mic: [
    p('M12 19v3'),
    p('M19 10v2a7 7 0 0 1-14 0v-2'),
    { tag: 'rect', x: 9, y: 2, width: 6, height: 13, rx: 3 },
  ],
  search: [p('m21 21-4.34-4.34'), c(11, 11, 8)],
  settings: [
    p('M10 5H3'),
    p('M12 19H3'),
    p('M14 3v4'),
    p('M16 17v4'),
    p('M21 12h-9'),
    p('M21 19h-5'),
    p('M21 5h-7'),
    p('M8 10v4'),
    p('M8 12H3'),
  ],
  route: [p('M7 7h10v10'), p('M7 17 17 7')],
  play: [p('M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z')],
  power: [p('M12 2v10'), p('M18.4 6.6a9 9 0 1 1-12.77.04')],
  chevron: [p('m9 18 6-6-6-6')],
  close: [p('M18 6 6 18'), p('m6 6 12 12')],
  check: [p('M20 6 9 17l-5-5')],
  moon: [
    p(
      'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401',
    ),
  ],
  // Brand hearth-flame.
  mark: [
    p('M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4'),
  ],
  'smart-home': [
    p('M10 12V8.964'),
    p('M14 12V8.964'),
    p('M15 12a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2a1 1 0 0 1 1-1z'),
    p(
      'M8.5 21H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-2',
    ),
  ],

  // ── Weather sub-icons (returned by the weather connector as `wx-*`) ───────
  'wx-clear': [
    c(12, 12, 4),
    p('M12 2v2'),
    p('M12 20v2'),
    p('m4.93 4.93 1.41 1.41'),
    p('m17.66 17.66 1.41 1.41'),
    p('M2 12h2'),
    p('M20 12h2'),
    p('m6.34 17.66-1.41 1.41'),
    p('m19.07 4.93-1.41 1.41'),
  ],
  'wx-partly': [
    p('M12 2v2'),
    p('m4.93 4.93 1.41 1.41'),
    p('M20 12h2'),
    p('m19.07 4.93-1.41 1.41'),
    p('M15.947 12.65a4 4 0 0 0-5.925-4.128'),
    p('M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z'),
  ],
  'wx-cloud': [p('M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z')],
  'wx-fog': [
    p('M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242'),
    p('M16 17H7'),
    p('M17 21H9'),
  ],
  'wx-drizzle': [
    p('M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242'),
    p('M8 19v1'),
    p('M8 14v1'),
    p('M16 19v1'),
    p('M16 14v1'),
    p('M12 21v1'),
    p('M12 16v1'),
  ],
  'wx-rain': [
    p('M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242'),
    p('M16 14v6'),
    p('M8 14v6'),
    p('M12 16v6'),
  ],
  'wx-snow': [
    p('M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242'),
    p('M8 15h.01'),
    p('M8 19h.01'),
    p('M12 17h.01'),
    p('M12 21h.01'),
    p('M16 15h.01'),
    p('M16 19h.01'),
  ],
  'wx-storm': [
    p('M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973'),
    p('m13 12-3 5h4l-3 5'),
  ],
  'wx-unknown': [c(12, 12, 10), p('M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'), p('M12 17h.01')],
} satisfies Record<string, IconShape[]>;

/** The union of every available icon name. */
export type IconName = keyof typeof ICONS;
