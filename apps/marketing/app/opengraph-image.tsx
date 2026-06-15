import { ImageResponse } from 'next/og';

/**
 * Branded Open Graph card (1200×630) for social shares of heylar.ai.
 * Rendered by next/og (Satori) — uses only inline styles + the bundled default
 * font so it can never fail on a missing asset. Matches the site's warm "ember"
 * palette: cream→amber wash, slate ink, the amber hearth accent.
 */
export const alt =
  'Lar — a neutral, voice-driven control surface that routes you outward. Local-first, end-to-end encrypted, never sold.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px 88px',
        background: 'linear-gradient(135deg, #f6efe7 0%, #efe7f2 52%, #f7e4cf 100%)',
        color: '#26303c',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: '#d98a2b',
            display: 'flex',
          }}
        />
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>
          heylar.ai
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', fontSize: 128, fontWeight: 800, letterSpacing: -2 }}>
          Lar
        </div>
        <div style={{ display: 'flex', fontSize: 46, fontWeight: 600, lineHeight: 1.15 }}>
          One warm surface for everything you control.
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            fontWeight: 500,
            color: '#5a6573',
            maxWidth: 900,
          }}
        >
          Say what you want — Lar routes you out to the best place to play, watch, or open it.
        </div>
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, color: '#7a5320' }}
      >
        <div style={{ display: 'flex', fontWeight: 700 }}>Local-first</div>
        <div style={{ display: 'flex', color: '#b0866a' }}>·</div>
        <div style={{ display: 'flex', fontWeight: 700 }}>End-to-end encrypted</div>
        <div style={{ display: 'flex', color: '#b0866a' }}>·</div>
        <div style={{ display: 'flex', fontWeight: 700 }}>Never sold</div>
      </div>
    </div>,
    { ...size },
  );
}
