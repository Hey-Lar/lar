import type { Config } from 'tailwindcss';

// Mirrors @lar/ui tokens (inlined here so the Tailwind config loader never has
// to resolve a workspace TS export). Keep in sync with packages/ui/src/tokens.ts.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hearth: { DEFAULT: '#d98a2b', lo: '#f0b357' },
        teal: '#3aa6a0',
        ink: { DEFAULT: '#26303c', soft: '#5a6573', faint: '#8b96a4' },
      },
      fontFamily: {
        display: ["'Fraunces'", 'ui-serif', 'Georgia', 'serif'],
        ui: ["'Manrope'", 'system-ui', 'sans-serif'],
      },
      borderRadius: { glass: '30px', card: '26px' },
      boxShadow: {
        glass: '0 18px 50px -20px rgba(40,52,68,.45), 0 6px 18px -10px rgba(40,52,68,.25)',
      },
    },
  },
  plugins: [],
};

export default config;
