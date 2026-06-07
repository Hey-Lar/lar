'use client';

/**
 * Ambient scene background — privacy-safe, all CSS / inline-SVG (no <img>, no
 * network fetch). Renders EVERY scene's layers once; the active `[data-scene]`
 * on <html> reveals only its own layers via CSS (see globals.css), so switching
 * scenes needs no JS and is pre-paint friendly. Mounted once at the top of the
 * <body> (app/layout.tsx) so it sits behind every route.
 *
 * Layer inventory (hidden by default; each [data-scene] block reveals its set):
 *   .scene-root     — per-scene gradient base (living / calm / hearth / dawn / night / mesh)
 *   .scene-living   — living-room's stylized, depth-shaded 3D room (default scene)
 *   .scene-room     — hearth's cozy-room silhouette (mantel + flanking furniture)
 *   .glow-hearth    — hearth fireplace fire bloom (sits in the mantel opening)
 *   .scene-svg      — dawn-skyline 2-row building silhouette
 *   .aurora-ribbon  — aurora's three drifting ribbons
 *   .scene .blob    — warm-mesh's two corner blobs
 *   .scene-scrim    — legibility wash over the scene, under the glass
 *   .grain          — fine film grain on top
 */
export function SceneBackground() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-root" />

      {/*
       * living-room (default) — a stylized, softly-lit 3D-feeling room composed
       * back-to-front. Volume comes from SVG <linearGradient>/<radialGradient>
       * fills (lit toward the window on the right, darker away) + blurred
       * contact-shadow ellipses (feGaussianBlur) grounding each piece. All fills
       * read from theme tokens (--room-*) so the same shapes look sunlit on
       * ember/light and cozy-dim on dark. Calm in the upper-center (where tiles
       * sit); furniture lives in the lower ~55%. Revealed only on
       * [data-scene='living-room']. No <img>, no network — pure inline SVG.
       */}
      <svg
        className="scene-living"
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden
        focusable="false"
      >
        <defs>
          {/* back wall — subtle vertical falloff, a touch brighter up high */}
          <linearGradient id="lr-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-wall-hi)" />
            <stop offset="0.62" stopColor="var(--room-wall)" />
            <stop offset="1" stopColor="var(--room-wall)" />
          </linearGradient>
          {/* horizontal wash so the window side of the wall reads lit */}
          <linearGradient id="lr-wall-light" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--room-window)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--room-window)" stopOpacity="0.5" />
          </linearGradient>
          {/* wood floor — receding plane: lighter at the far edge, warm + deep near */}
          <linearGradient id="lr-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-floor-hi)" />
            <stop offset="0.5" stopColor="var(--room-floor)" />
            <stop offset="1" stopColor="var(--room-shadow)" />
          </linearGradient>
          {/* warm pool of daylight spilling onto the floor near the window */}
          <radialGradient id="lr-floorglow" cx="0.72" cy="0.28" r="0.6">
            <stop offset="0" stopColor="var(--hearth-glow)" />
            <stop offset="1" stopColor="var(--hearth-glow)" stopOpacity="0" />
          </radialGradient>
          {/* daylight in the glazing — clear warm top → cooler bottom, brighter */}
          <linearGradient id="lr-sky" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="var(--room-window)" />
            <stop offset="0.32" stopColor="var(--hearth-lo)" stopOpacity="0.4" />
            <stop offset="0.62" stopColor="var(--teal)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--room-window)" stopOpacity="0.9" />
          </linearGradient>
          {/* sofa body — strongly lit on top/window edge, deep at the base.
              More stops + a wider lit→dark range so the volume reads as solid. */}
          <linearGradient id="lr-sofa" x1="0.2" y1="0" x2="0.85" y2="1.05">
            <stop offset="0" stopColor="var(--room-furniture-hi)" />
            <stop offset="0.4" stopColor="var(--room-furniture)" />
            <stop offset="1" stopColor="var(--room-shadow)" />
          </linearGradient>
          {/* cushion — top-lit rounded volume, crisper falloff to a shaded base */}
          <linearGradient id="lr-cushion" x1="0" y1="0" x2="0.18" y2="1">
            <stop offset="0" stopColor="var(--room-furniture-hi)" />
            <stop offset="0.42" stopColor="var(--room-furniture)" />
            <stop offset="1" stopColor="var(--room-shadow)" />
          </linearGradient>
          {/* table top — thin lit slab, crisp lit edge → deep front lip */}
          <linearGradient id="lr-table" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="var(--room-floor-hi)" />
            <stop offset="0.5" stopColor="var(--room-floor)" />
            <stop offset="1" stopColor="var(--room-shadow)" />
          </linearGradient>
          {/* lamp shade glow */}
          <radialGradient id="lr-lamp" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor="var(--hearth-lo)" />
            <stop offset="1" stopColor="var(--hearth-lo)" stopOpacity="0" />
          </radialGradient>
          {/* tight contact shadow — crisper now (less blur) so furniture grounds */}
          <filter id="lr-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          {/* soft ambient shadow */}
          <filter id="lr-blur-lg" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          {/* center-calm vignette: clear middle, gently darkened edges */}
          <radialGradient id="lr-vignette" cx="0.5" cy="0.42" r="0.75">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.7" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.22" />
          </radialGradient>
        </defs>

        {/* ── back wall ─────────────────────────────────────────────── */}
        <rect x="0" y="0" width="1440" height="470" fill="url(#lr-wall)" />
        <rect x="0" y="0" width="1440" height="470" fill="url(#lr-wall-light)" />

        {/* framed picture on the wall, left of the window */}
        <g>
          <rect
            x="232"
            y="150"
            width="150"
            height="120"
            rx="6"
            fill="var(--room-furniture)"
            stroke="var(--room-shadow)"
            strokeWidth="3"
          />
          <rect x="248" y="166" width="118" height="88" rx="3" fill="url(#lr-floorglow)" />
          <rect
            x="248"
            y="166"
            width="118"
            height="88"
            rx="3"
            fill="var(--room-wall-hi)"
            fillOpacity="0.55"
          />
        </g>

        {/* ── window (upper-right third) — the room's light source ───── */}
        <g>
          {/* sill / casing shadow underneath */}
          <rect x="968" y="356" width="346" height="16" rx="4" fill="var(--room-shadow)" />
          {/* outer casing */}
          <rect
            x="972"
            y="74"
            width="338"
            height="290"
            rx="14"
            fill="var(--room-furniture-hi)"
            stroke="var(--room-shadow)"
            strokeWidth="2"
          />
          {/* glazing (daylight) */}
          <rect x="990" y="92" width="302" height="254" rx="8" fill="url(#lr-sky)" />
          {/* bright sky-glow blooming from the top of the glazing */}
          <rect
            x="990"
            y="92"
            width="302"
            height="120"
            rx="8"
            fill="url(#lr-floorglow)"
            opacity="0.5"
          />
          {/* muntins — a simple cross */}
          <rect x="1135" y="92" width="12" height="254" fill="var(--room-furniture-hi)" />
          <rect x="990" y="212" width="302" height="12" fill="var(--room-furniture-hi)" />
          {/* sill slab */}
          <rect x="960" y="364" width="362" height="14" rx="5" fill="var(--room-furniture-hi)" />
          {/* bright sill highlight — daylight catching the front lip */}
          <rect
            x="964"
            y="364"
            width="354"
            height="5"
            rx="3"
            fill="var(--room-window)"
            opacity="0.9"
          />
        </g>

        {/* soft light beam spilling from the window into the room (down-left) —
            a touch more visible but still soft */}
        <polygon
          points="996,118 1286,118 1180,470 612,470"
          fill="url(#lr-sky)"
          opacity="0.22"
          filter="url(#lr-blur-lg)"
        />

        {/* ── floor — perspective plane (trapezoid, wider at the bottom) ─ */}
        <polygon points="0,470 1440,470 1440,720 0,720" fill="url(#lr-floor)" />
        {/* faint perspective floor-board lines fanning toward the viewer so the
            floor reads as a real receding wood surface (calm, low-opacity) */}
        <g stroke="var(--room-shadow)" strokeWidth="2" opacity="0.16">
          <line x1="250" y1="474" x2="-120" y2="720" />
          <line x1="520" y1="474" x2="360" y2="720" />
          <line x1="760" y1="474" x2="760" y2="720" />
          <line x1="1000" y1="474" x2="1190" y2="720" />
          <line x1="1240" y1="474" x2="1620" y2="720" />
        </g>
        {/* baseboard / ambient-occlusion line where wall meets floor (crisper) */}
        <rect x="0" y="466" width="1440" height="6" fill="var(--room-shadow)" opacity="0.85" />
        <rect x="0" y="472" width="1440" height="12" fill="var(--room-shadow)" opacity="0.4" />
        {/* warm daylight pool on the floor near the window */}
        <ellipse cx="1040" cy="560" rx="430" ry="150" fill="url(#lr-floorglow)" />

        {/* rug — soft ellipse with a concentric border so it reads as a surface */}
        <ellipse cx="700" cy="624" rx="500" ry="86" fill="var(--room-floor-hi)" opacity="0.42" />
        <ellipse
          cx="700"
          cy="624"
          rx="466"
          ry="78"
          fill="none"
          stroke="var(--room-window)"
          strokeWidth="3"
          opacity="0.35"
        />
        <ellipse
          cx="700"
          cy="624"
          rx="430"
          ry="66"
          fill="none"
          stroke="var(--room-shadow)"
          strokeWidth="3"
          opacity="0.38"
        />
        <ellipse
          cx="700"
          cy="624"
          rx="396"
          ry="56"
          fill="none"
          stroke="var(--room-shadow)"
          strokeWidth="2"
          opacity="0.22"
        />

        {/* ── potted plant — left of the window ─────────────────────── */}
        <g>
          {/* contact shadow — soft + a tight darker core for grounding */}
          <ellipse
            cx="470"
            cy="590"
            rx="80"
            ry="18"
            fill="var(--room-shadow)"
            filter="url(#lr-blur-lg)"
          />
          <ellipse
            cx="470"
            cy="589"
            rx="56"
            ry="11"
            fill="var(--room-shadow)"
            opacity="0.7"
            filter="url(#lr-blur)"
          />
          {/* fronds — muted sage so the plant sits in the warm room, not over it */}
          <g fill="#7e8c66" opacity="0.5">
            <path d="M470 520 C432 506 410 452 422 396 C456 414 478 458 472 516 Z" />
            <path d="M470 520 C508 506 530 452 518 396 C484 414 462 458 468 516 Z" />
            <path d="M470 524 C440 520 412 488 410 446 C444 456 466 484 470 522 Z" />
            <path d="M470 524 C500 520 528 488 530 446 C496 456 474 484 470 522 Z" />
            <path d="M470 520 C470 470 470 430 470 392 C476 432 476 480 472 520 Z" />
          </g>
          {/* pot — tapered, lit on the window side */}
          <path d="M436 524 h68 l-10 64 h-48 Z" fill="url(#lr-cushion)" />
          <rect x="432" y="516" width="76" height="14" rx="4" fill="var(--room-furniture-hi)" />
        </g>

        {/* ── floor lamp — left side, warm glow ─────────────────────── */}
        <g>
          {/* soft + tight grounding shadow */}
          <ellipse
            cx="150"
            cy="602"
            rx="60"
            ry="14"
            fill="var(--room-shadow)"
            filter="url(#lr-blur-lg)"
          />
          <ellipse
            cx="150"
            cy="600"
            rx="40"
            ry="8"
            fill="var(--room-shadow)"
            opacity="0.7"
            filter="url(#lr-blur)"
          />
          {/* warm bloom around the shade */}
          <circle cx="150" cy="300" r="124" fill="url(#lr-lamp)" opacity="0.8" />
          {/* pole + base */}
          <rect x="145" y="318" width="10" height="270" rx="5" fill="var(--room-furniture)" />
          <rect x="118" y="584" width="64" height="12" rx="5" fill="var(--room-furniture)" />
          {/* drum shade, warm-lit, with a brighter front-lit edge */}
          <path d="M112 318 h76 l-14 -56 h-48 Z" fill="var(--hearth-lo)" opacity="0.9" />
          <path d="M118 312 h64 l-4 -16 h-56 Z" fill="var(--room-window)" opacity="0.5" />
        </g>

        {/* ── sofa — 3-seat, centered-lowish, volume-shaded ─────────── */}
        <g>
          {/* big soft ambient shadow grounding the whole sofa */}
          <ellipse
            cx="700"
            cy="662"
            rx="372"
            ry="44"
            fill="var(--room-shadow)"
            filter="url(#lr-blur-lg)"
          />
          {/* tight, darker contact shadow right under the base for crisp grounding */}
          <ellipse
            cx="700"
            cy="656"
            rx="312"
            ry="22"
            fill="var(--room-shadow)"
            opacity="0.7"
            filter="url(#lr-blur)"
          />

          {/* back rest (sits behind cushions) */}
          <rect x="452" y="470" width="496" height="120" rx="26" fill="url(#lr-sofa)" />
          {/* base / seat block */}
          <rect x="452" y="560" width="496" height="98" rx="20" fill="url(#lr-sofa)" />
          {/* AO seam where the back rest meets the seat block */}
          <rect
            x="470"
            y="566"
            width="460"
            height="6"
            rx="3"
            fill="var(--room-shadow)"
            opacity="0.4"
          />

          {/* three back cushions */}
          <rect x="476" y="486" width="148" height="96" rx="22" fill="url(#lr-cushion)" />
          <rect x="630" y="486" width="148" height="96" rx="22" fill="url(#lr-cushion)" />
          <rect x="784" y="486" width="148" height="96" rx="22" fill="url(#lr-cushion)" />
          {/* crisp top-lit edge along each back cushion */}
          <g fill="var(--room-furniture-hi)" opacity="0.7">
            <rect x="492" y="492" width="116" height="9" rx="5" />
            <rect x="646" y="492" width="116" height="9" rx="5" />
            <rect x="800" y="492" width="116" height="9" rx="5" />
          </g>
          {/* AO lines in the gaps between back cushions (definition) */}
          <g stroke="var(--room-shadow)" strokeWidth="3" opacity="0.5" strokeLinecap="round">
            <line x1="627" y1="494" x2="627" y2="576" />
            <line x1="781" y1="494" x2="781" y2="576" />
          </g>

          {/* three seat cushions */}
          <rect x="476" y="568" width="148" height="58" rx="18" fill="url(#lr-cushion)" />
          <rect x="630" y="568" width="148" height="58" rx="18" fill="url(#lr-cushion)" />
          <rect x="784" y="568" width="148" height="58" rx="18" fill="url(#lr-cushion)" />
          {/* AO lines between seat cushions */}
          <g stroke="var(--room-shadow)" strokeWidth="3" opacity="0.45" strokeLinecap="round">
            <line x1="627" y1="574" x2="627" y2="620" />
            <line x1="781" y1="574" x2="781" y2="620" />
          </g>

          {/* arms — rounded, lit on top (drawn last so they overlap cushions) */}
          <rect x="430" y="500" width="64" height="158" rx="24" fill="url(#lr-sofa)" />
          <rect x="906" y="500" width="64" height="158" rx="24" fill="url(#lr-sofa)" />
          {/* AO where each arm meets the cushions */}
          <g stroke="var(--room-shadow)" strokeWidth="4" opacity="0.4" strokeLinecap="round">
            <line x1="494" y1="512" x2="494" y2="640" />
            <line x1="906" y1="512" x2="906" y2="640" />
          </g>
          {/* arm top highlights */}
          <rect
            x="436"
            y="506"
            width="52"
            height="20"
            rx="10"
            fill="var(--room-furniture-hi)"
            opacity="0.75"
          />
          <rect
            x="912"
            y="506"
            width="52"
            height="20"
            rx="10"
            fill="var(--room-furniture-hi)"
            opacity="0.75"
          />
          {/* short legs */}
          <rect x="470" y="654" width="16" height="20" rx="4" fill="var(--room-shadow)" />
          <rect x="914" y="654" width="16" height="20" rx="4" fill="var(--room-shadow)" />
        </g>

        {/* ── coffee table — low rounded rect in front of the sofa ──── */}
        <g>
          {/* soft ambient + tight contact shadow for crisp grounding */}
          <ellipse
            cx="700"
            cy="702"
            rx="184"
            ry="22"
            fill="var(--room-shadow)"
            filter="url(#lr-blur-lg)"
          />
          <ellipse
            cx="700"
            cy="700"
            rx="150"
            ry="13"
            fill="var(--room-shadow)"
            opacity="0.7"
            filter="url(#lr-blur)"
          />
          {/* legs */}
          <rect x="586" y="678" width="12" height="30" rx="4" fill="var(--room-floor)" />
          <rect x="802" y="678" width="12" height="30" rx="4" fill="var(--room-floor)" />
          {/* top slab */}
          <rect x="560" y="664" width="280" height="26" rx="13" fill="url(#lr-table)" />
          {/* bright lit top edge */}
          <rect
            x="560"
            y="664"
            width="280"
            height="9"
            rx="13"
            fill="var(--room-floor-hi)"
            opacity="0.85"
          />
          {/* dark front lip so the slab reads as a thick surface */}
          <rect
            x="566"
            y="684"
            width="268"
            height="5"
            rx="3"
            fill="var(--room-shadow)"
            opacity="0.5"
          />
        </g>

        {/* center-calm vignette over everything (keeps tiles legible) */}
        <rect x="0" y="0" width="1440" height="720" fill="url(#lr-vignette)" />
      </svg>

      {/*
       * hearth — a subtle "designed room" read: a floor line, a centered
       * fireplace/mantel with an arched opening (the warm glow sits inside it),
       * and quiet furniture flanking it (armchair left; floor lamp + potted
       * plant right). Two depth layers: far wall hints (--sil-far) behind near
       * furniture + mantel (--sil-near). Revealed only on [data-scene="hearth"].
       */}
      <svg
        className="scene-room"
        aria-hidden
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* far layer — wall wainscot band + a framed picture above the mantel */}
        <g className="sil-far" fill="var(--sil-far)">
          {/* low wainscot / baseboard band running the wall */}
          <rect x="0" y="330" width="1440" height="14" />
          {/* a framed picture centered over the mantel */}
          <rect x="668" y="120" width="104" height="80" rx="4" />
          {/* a soft side console hint on the far right */}
          <rect x="1240" y="250" width="150" height="14" rx="4" />
        </g>

        {/* near layer — floor line, mantel surround, and the flanking furniture */}
        <g className="sil-near" fill="var(--sil-near)">
          {/* floor line across the bottom */}
          <rect x="0" y="378" width="1440" height="42" />

          {/* fireplace / mantel: surround block with an arched opening cut out */}
          <path
            d="M590 378
               V236
               h260
               v142
               H800
               v-66
               a80 80 0 0 0 -160 0
               v66
               Z"
          />
          {/* mantel shelf — a thin slab capping the surround */}
          <rect x="566" y="218" width="308" height="20" rx="4" />

          {/* armchair (left): seat block + high back + a stubby arm */}
          <path
            d="M300 378
               v-96
               a26 26 0 0 1 26 -26
               h70
               v122
               Z"
          />
          <rect x="392" y="300" width="78" height="78" rx="10" />

          {/* floor lamp (right of the hearth): slim pole + a drum shade */}
          <rect x="1052" y="250" width="10" height="128" rx="5" />
          <path d="M1030 250 h54 l-12 -40 h-30 Z" />
          {/* potted plant (far right): pot + two simple fronds */}
          <path d="M1150 378 v-44 h64 v44 Z" />
          <path
            d="M1182 334
               c-30 -10 -44 -44 -38 -78
               c22 8 38 34 38 66
               c0 -34 16 -62 40 -72
               c4 34 -10 66 -40 76 Z"
          />
        </g>
      </svg>

      {/* hearth — warm fire bloom (sits in the fireplace opening; revealed only on [data-scene="hearth"]) */}
      <div className="glow-hearth" />

      {/* dawn-skyline — two silhouette rows over a dawn gradient + low sun */}
      <svg className="scene-svg" viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice">
        <g className="sil-far" fill="var(--sil-far)">
          <rect x="0" y="170" width="120" height="190" />
          <rect x="150" y="120" width="90" height="240" />
          <rect x="270" y="190" width="140" height="170" />
          <rect x="440" y="140" width="80" height="220" />
          <rect x="545" y="200" width="120" height="160" />
          <rect x="690" y="150" width="100" height="210" />
          <rect x="815" y="185" width="150" height="175" />
          <rect x="985" y="130" width="85" height="230" />
          <rect x="1095" y="195" width="130" height="165" />
          <rect x="1250" y="160" width="95" height="200" />
          <rect x="1365" y="200" width="75" height="160" />
        </g>
        <g className="sil-near" fill="var(--sil-near)">
          <rect x="-20" y="240" width="160" height="120" />
          <rect x="160" y="210" width="110" height="150" />
          <rect x="300" y="260" width="130" height="100" />
          <rect x="460" y="220" width="100" height="140" />
          <rect x="590" y="255" width="150" height="105" />
          <rect x="770" y="225" width="120" height="135" />
          <rect x="920" y="262" width="140" height="98" />
          <rect x="1090" y="230" width="110" height="130" />
          <rect x="1230" y="258" width="160" height="102" />
          <rect x="1410" y="235" width="70" height="125" />
        </g>
      </svg>

      {/* aurora — three tall blurred ribbons drifting */}
      <div className="aurora-ribbon r1" />
      <div className="aurora-ribbon r2" />
      <div className="aurora-ribbon r3" />

      {/* warm-mesh — today's two corner blobs, preserved as a named scene */}
      <div className="blob m1" />
      <div className="blob m2" />

      {/* Optional photoreal layer for the living-room scene: if a bundled image
          exists at /local/living-room.jpg it covers the stylized SVG room; if
          absent the CSS background simply doesn't render (no network fetch),
          so the SVG room remains the fallback. Privacy: local, git-ignored. */}
      <div className="scene-photo" />

      <div className="scene-scrim" />
      <div className="grain" />
    </div>
  );
}
