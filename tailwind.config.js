/** @type {import('tailwindcss').Config} */
// Tailwind color tokens map to the semantic CSS variables defined in
// src/index.css (:root[data-theme="dark"|"light"]). Switching the data-theme
// attribute on <html> re-themes every Tailwind class that references a var.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-press': 'var(--accent-press)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        btn: '8px',
      },
      spacing: {
        // SCALE-UP: single source for card padding (p-card). 20px -> 24px makes
        // every surface card feel bigger; tune here to adjust all cards at once.
        card: '24px',
      },
    },
  },
  plugins: [],
};
