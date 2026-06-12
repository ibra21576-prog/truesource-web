/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#0a1628',
        surface: '#111f35',
        card:    '#162236',
        border:  '#1e3050',
        accent:  '#4FE6C7',
        'accent-dim': '#2db89e',
        muted:   '#8aa4c0',
      },
    },
  },
  plugins: [],
}
