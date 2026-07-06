/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Monochrome atelier palette — Ink on Paper, Graphite/Stone for hierarchy.
        black: '#000000',
        lime: '#E1FF00', // kept ONLY for the tab bar (FloatingDock) accent
        'lime-soft': '#EEFF7A',
        'lime-tint': '#F4FFB0',
        white: '#FFFFFF',
        paper: '#FFFFFF',
        graphite: '#858585',
        stone: '#8E8E90',
        'grey-soft': '#F4F4F4', // secondary surfaces / inputs
        'grey-mid': '#8E8E90', // secondary text / icons (Graphite/Stone)
        'grey-line': '#E7E7E7',
        ink: '#000000',
      },
      fontFamily: {
        sans: [
          'Inter',
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      fontSize: {
        // Restrained scale — single-ish weight (atelier). Regularity is the signature.
        display: ['23px', { lineHeight: '28px', letterSpacing: '-0.017em', fontWeight: '500' }], // H1 / Headline
        section: ['19px', { lineHeight: '24px', letterSpacing: '-0.017em', fontWeight: '500' }], // H2 / Title
        subtitle: ['16px', { lineHeight: '22px', letterSpacing: '-0.01em', fontWeight: '500' }], // H3 / Subtitle
        t1: ['15px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '400' }], // Title 1 / UI
        btn: ['15px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '500' }], // Button Text
        'body-l': ['15px', { lineHeight: '22px', letterSpacing: '-0.01em', fontWeight: '400' }], // Body / Main
        'body-s': ['13px', { lineHeight: '17px', letterSpacing: '-0.01em', fontWeight: '400' }], // Caption / Small
        overline: ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' }], // Overline
      },
      borderRadius: {
        // Crisp, consistent radii (atelier): cards square-ish, buttons pill.
        card: '14px',
        ctrl: '12px',
        btn: '10px',
        pill: '9999px',
      },
      spacing: {
        gutter: '20px',
        card: '20px',
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        // Flatness is the philosophy — borders do the work of shadows.
        dock: '0 12px 40px -8px rgba(0,0,0,0.28)', // tab bar keeps its lift
        card: '0 0 0 1px #ECECEC',
        lift: '0 0 0 1px rgba(0,0,0,0.14)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.96) translateY(4px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.28s cubic-bezier(0.16,1,0.3,1)',
        'pulse-ring': 'pulse-ring 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
}
