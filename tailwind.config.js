/** @type {import('tailwindcss').Config} */
// Source of truth for raw values: src/styles/tokens.css (CSS variables)
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          deep: 'var(--color-brand-deep)',
          navy: 'var(--color-brand-navy)',
          light: 'var(--color-brand-light)',
        },
        accent: 'var(--color-accent)',
        disabled: 'var(--color-disabled)',
        magenta: 'var(--color-magenta)',
        gold: 'var(--color-gold)',
        danger: 'var(--color-danger)',
        ok: 'var(--color-ok)',
        ink: 'var(--color-ink)',
        ink2: 'var(--color-ink2)',
        muted: 'var(--color-muted)',
        line: 'var(--color-line)',
        line2: 'var(--color-line2)',
        surface: 'var(--color-surface)',
        canvas: 'var(--color-canvas)',
      },
      borderRadius: { card: 'var(--radius-card)', pill: 'var(--radius-pill)' },
      fontFamily: {
        sans: ['"Zen Maru Gothic"', 'system-ui', 'sans-serif'],
        logo: ['Orbitron', 'sans-serif'],
      },
      backgroundImage: {
        'gauge': 'linear-gradient(90deg, var(--grad-from), var(--grad-to))',
        'header': 'linear-gradient(120deg, #2f318e 0%, #3d40b8 45%, #4a6fd6 100%)',
      },
    },
  },
  plugins: [],
}
