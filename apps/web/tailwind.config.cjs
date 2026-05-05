/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0B',
        surface: '#141416',
        'surface-2': '#1B1B1F',
        'surface-3': '#23232A',
        border: '#2A2A33',
        'border-strong': '#3A3A45',
        muted: '#71717A',
        ink: '#F4F4F5',
        accent: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        success: { DEFAULT: '#10B981', soft: 'rgba(16,185,129,0.12)' },
        warn: { DEFAULT: '#F59E0B', soft: 'rgba(245,158,11,0.12)' },
        danger: { DEFAULT: '#EF4444', soft: 'rgba(239,68,68,0.12)' },
        info: { DEFAULT: '#06B6D4', soft: 'rgba(6,182,212,0.12)' },
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(0,0,0,0.3)',
        elevated: '0 4px 20px rgba(0,0,0,0.45)',
        glow: '0 0 0 4px rgba(59,130,246,0.15)',
      },
      fontFamily: {
        sans: [
          'InterVariable',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      keyframes: {
        in: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        in: 'in 200ms ease-out',
        slideUp: 'slideUp 250ms ease-out',
        pulseDot: 'pulseDot 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
