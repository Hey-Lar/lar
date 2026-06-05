/**
 * Tailwind preset exposing the Lar tokens. Consumed by every web surface
 * (`presets: [larPreset]`) so marketing + portal share one design language.
 * Typed loosely to avoid a tailwindcss dependency in this package.
 */
import { color, radius, font, shadow } from './tokens';

export const larPreset = {
  theme: {
    extend: {
      colors: {
        hearth: { DEFAULT: color.hearth, lo: color.hearthLo },
        teal: color.teal,
        ink: { DEFAULT: color.ink, soft: color.inkSoft, faint: color.inkFaint },
      },
      fontFamily: {
        display: [font.display],
        ui: [font.ui],
      },
      borderRadius: {
        glass: radius.glass,
        card: radius.card,
      },
      boxShadow: {
        glass: shadow.glass,
        hearth: shadow.hearth,
      },
      backgroundColor: {
        glass: color.glass,
        glass2: color.glass2,
      },
      borderColor: {
        glass: color.stroke,
      },
    },
  },
} as const;

export default larPreset;
