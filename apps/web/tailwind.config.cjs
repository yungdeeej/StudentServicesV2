/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0B',
        surface: '#141416',
        accent: '#3B82F6',
        success: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
};
