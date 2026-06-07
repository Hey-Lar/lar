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
 *   .glow-hearth    — hearth bottom-center fire bloom
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

      {/* hearth — warm fire bloom (revealed only on [data-scene="hearth"]) */}
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
