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
        primary: { DEFAULT: '#984447', d: '#FFB3B2' },
        'on-primary': { DEFAULT: '#FFFFFF', d: '#571D22' },
        'primary-container': { DEFAULT: '#FFDAD9', d: '#743337' },
        'on-primary-container': { DEFAULT: '#3E0A0E', d: '#FFDAD9' },
        secondary: { DEFAULT: '#775654', d: '#E7BDBA' },
        'secondary-container': { DEFAULT: '#FFDAD9', d: '#5D3F3D' },
        'on-secondary-container': { DEFAULT: '#2C1516', d: '#FFDAD9' },
        tertiary: { DEFAULT: '#755B2E', d: '#E5C28C' },
        'tertiary-container': { DEFAULT: '#FFDEA1', d: '#5A4319' },
        'on-tertiary-container': { DEFAULT: '#271900', d: '#FFDEA1' },
        error: { DEFAULT: '#BA1A1A', d: '#FFB4AB' },
        'error-container': { DEFAULT: '#FFDAD6', d: '#93000A' },
        'on-error-container': { DEFAULT: '#410002', d: '#FFDAD6' },
        surface: { DEFAULT: '#FFF8F7', d: '#1A1110' },
        'on-surface': { DEFAULT: '#241918', d: '#F1DFDD' },
        'surface-variant': { DEFAULT: '#F4DDDB', d: '#524342' },
        'on-surface-variant': { DEFAULT: '#524342', d: '#D8C2C0' },
        'surface-lowest': { DEFAULT: '#FFFFFF', d: '#140C0B' },
        'surface-low': { DEFAULT: '#FFF0EF', d: '#241918' },
        'surface-container': { DEFAULT: '#FDEAE8', d: '#281D1C' },
        'surface-high': { DEFAULT: '#F7E4E2', d: '#332826' },
        'surface-highest': { DEFAULT: '#F1DFDD', d: '#3E3231' },
        outline: { DEFAULT: '#857371', d: '#A08C8A' },
        'outline-variant': { DEFAULT: '#D8C2C0', d: '#524342' },
        success: { DEFAULT: '#146C2E', d: '#8EDD9C' },
        'success-container': { DEFAULT: '#A9F5B6', d: '#005321' },
        'on-success-container': { DEFAULT: '#002106', d: '#A9F5B6' },
        warning: { DEFAULT: '#785900', d: '#FABD00' },
        'warning-container': { DEFAULT: '#FFDF9E', d: '#5B4300' },
        'on-warning-container': { DEFAULT: '#261A00', d: '#FFDF9E' },
      },
      borderRadius: {
        // M3 shape scale
        'm3-xs': '4px',
        'm3-sm': '8px',
        'm3-md': '12px',
        'm3-lg': '16px',
        'm3-xl': '28px',
      },
    },
  },
  plugins: [],
};
