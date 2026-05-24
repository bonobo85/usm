/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        usm: {
          gold: '#d4a13a',
          'gold-light': '#f0c14b',
          'gold-dark': '#9c7621',
          blue: '#2c5fb8',
          red: '#b8252b',
          'red-bright': '#d63239',
          cream: '#f4ecd6',
        },
        bg: {
          DEFAULT: '#0a0a12',
          2: '#0d0d18',
        },
        panel: {
          DEFAULT: '#11111e',
          2: '#161626',
          3: '#1c1c2e',
        },
        border: {
          DEFAULT: '#1f1f33',
          soft: '#18182a',
        },
        text: {
          DEFAULT: '#e8ecf5',
          dim: '#9aa3bd',
          faint: '#5a6485',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
