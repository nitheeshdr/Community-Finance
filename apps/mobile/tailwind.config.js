/**
 * Material 3 token palette (mirrors src/lib/theme.ts).
 * Usage: bg-surface dark:bg-surface-d, text-on-surface dark:text-on-surface-d
 * — the `-d` suffix is the dark-scheme value of the same token.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4F46E5', d: '#BFC2FF' },
        'on-primary': { DEFAULT: '#FFFFFF', d: '#1E1D95' },
        'primary-container': { DEFAULT: '#E2DFFF', d: '#3730A3' },
        'on-primary-container': { DEFAULT: '#0E0664', d: '#E2DFFF' },
        secondary: { DEFAULT: '#5D5C72', d: '#C6C4DD' },
        'secondary-container': { DEFAULT: '#E2E0F9', d: '#454459' },
        'on-secondary-container': { DEFAULT: '#1A1A2C', d: '#E2E0F9' },
        tertiary: { DEFAULT: '#006A60', d: '#54DBC9' },
        'tertiary-container': { DEFAULT: '#74F8E5', d: '#005048' },
        'on-tertiary-container': { DEFAULT: '#00201C', d: '#74F8E5' },
        error: { DEFAULT: '#BA1A1A', d: '#FFB4AB' },
        'error-container': { DEFAULT: '#FFDAD6', d: '#93000A' },
        'on-error-container': { DEFAULT: '#410002', d: '#FFDAD6' },
        surface: { DEFAULT: '#FCF8FF', d: '#131318' },
        'on-surface': { DEFAULT: '#1B1B21', d: '#E4E1E9' },
        'surface-variant': { DEFAULT: '#E4E1EC', d: '#46464F' },
        'on-surface-variant': { DEFAULT: '#46464F', d: '#C7C5D0' },
        'surface-lowest': { DEFAULT: '#FFFFFF', d: '#0E0E13' },
        'surface-low': { DEFAULT: '#F6F2FA', d: '#1B1B21' },
        'surface-container': { DEFAULT: '#F0ECF4', d: '#1F1F25' },
        'surface-high': { DEFAULT: '#EAE7EF', d: '#2A2A30' },
        'surface-highest': { DEFAULT: '#E4E1E9', d: '#35343B' },
        outline: { DEFAULT: '#777680', d: '#918F9A' },
        'outline-variant': { DEFAULT: '#C7C5D0', d: '#46464F' },
        success: { DEFAULT: '#146C2E', d: '#8EDD9C' },
        'success-container': { DEFAULT: '#A9F5B6', d: '#005321' },
        'on-success-container': { DEFAULT: '#002106', d: '#A9F5B6' },
        warning: { DEFAULT: '#785900', d: '#FABD00' },
        'warning-container': { DEFAULT: '#FFDF9E', d: '#5B4300' },
        'on-warning-container': { DEFAULT: '#261A00', d: '#FFDF9E' },
      },
      borderRadius: {
        // M3 Expressive shape scale — larger, rounder corners
        'm3-xs': '8px',
        'm3-sm': '12px',
        'm3-md': '16px',
        'm3-lg': '24px',
        'm3-xl': '32px',
        'm3-2xl': '40px',
      },
    },
  },
  plugins: [],
};
