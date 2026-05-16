/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Noto Serif SC"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0a0908',
          900: '#12100e',
          800: '#1c1917',
          700: '#292524',
          600: '#44403c',
          500: '#57534e',
          400: '#78716c',
          200: '#d6d3d1',
          100: '#f5f5f4',
          50: '#fafaf9',
        },
        vermillion: {
          500: '#dc2626',
          400: '#ef4444',
          300: '#fca5a5',
        },
        jade: {
          600: '#059669',
          500: '#10b981',
          300: '#6ee7b7',
        },
        gold: {
          500: '#d97706',
          400: '#f59e0b',
          300: '#fcd34d',
        },
        azure: {
          600: '#2563eb',
          500: '#3b82f6',
          300: '#93c5fd',
        },
      },
    },
  },
  plugins: [],
}
