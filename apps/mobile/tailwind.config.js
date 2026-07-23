/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mirrors the web dashboard palette (indigo primary).
        primary: {
          DEFAULT: '#4f46e5',
          dark: '#6366f1',
          foreground: '#ffffff',
        },
        success: '#16a34a',
        warning: '#d97706',
        destructive: '#dc2626',
        muted: '#6b7280',
        card: '#ffffff',
        'card-dark': '#1e1e2b',
        background: '#f8f8fb',
        'background-dark': '#12121a',
        border: '#e5e7eb',
        'border-dark': '#2d2d3d',
      },
    },
  },
  plugins: [],
};
