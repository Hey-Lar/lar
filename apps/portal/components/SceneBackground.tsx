'use client';

/**
 * Ambient scene background — privacy-safe, all CSS / inline-SVG (no <img>, no
 * network fetch). Renders EVERY scene's layers once; the active `[data-scene]`
 * on <html> reveals only its own layers via CSS (see globals.css), so switching
 * scenes needs no JS and is pre-paint friendly. Mounted once at the top of the
 * <body> (app/layout.tsx) so it sits behind every route.
 *
 * Layer inventory (hidden by default; each [data-scene] block reveals its set):
 *   .scene-root     — per-scene gradient base (calm / hearth / dawn / night / mesh)
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

      <div className="scene-scrim" />
      <div className="grain" />
    </div>
  );
}
