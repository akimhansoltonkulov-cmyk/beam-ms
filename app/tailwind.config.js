/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Beam brand palette (Design.pdf §1)
        black: '#000000',
        lime: '#E1FF00', // Accent Lime (Acid)
        'lime-soft': '#EEFF7A',
        'lime-tint': '#F4FFB0',
        white: '#FFFFFF',
        'grey-soft': '#F2F2F2', // Soft Grey — secondary surfaces / inputs
        'grey-mid': '#8E8E93', // Medium Grey — secondary text / icons
        'grey-line': '#E6E6E6',
        ink: '#0A0A0A',
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
        // Typography scale (Design.pdf §2)
        display: ['34px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        section: ['20px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-l': ['17px', { lineHeight: '1.45', fontWeight: '500' }],
        'body-s': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        btn: ['15px', { lineHeight: '1', letterSpacing: '0.01em', fontWeight: '700' }],
      },
      borderRadius: {
        // Extreme radii (Design.pdf §3)
        card: '32px',
        ctrl: '24px',
        btn: '16px',
        pill: '100px',
      },
      spacing: {
        gutter: '20px',
        card: '20px',
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        dock: '0 12px 40px -8px rgba(0,0,0,0.28)',
        card: '0 2px 20px -8px rgba(0,0,0,0.10)',
        lift: '0 20px 60px -20px rgba(0,0,0,0.35)',
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
