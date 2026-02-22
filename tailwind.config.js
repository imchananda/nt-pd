/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        prada: {
          offwhite: 'rgb(var(--prada-offwhite) / <alpha-value>)',
          cream: 'rgb(var(--prada-cream) / <alpha-value>)',
          parchment: 'rgb(var(--prada-parchment) / <alpha-value>)',
          stone: 'rgb(var(--prada-stone) / <alpha-value>)',
          warm: 'rgb(var(--prada-warm) / <alpha-value>)',
          taupe: 'rgb(var(--prada-taupe) / <alpha-value>)',
          charcoal: 'rgb(var(--prada-charcoal) / <alpha-value>)',
          black: 'rgb(var(--prada-black) / <alpha-value>)',
          gold: 'rgb(var(--prada-gold) / <alpha-value>)',
          darkgold: 'rgb(var(--prada-darkgold) / <alpha-value>)',
          'red-light': 'rgb(var(--prada-red-light) / <alpha-value>)',
          red: 'rgb(var(--prada-red) / <alpha-value>)',
        }
      },
      fontFamily: {
        display: ['"Poiret One"', '"Noto Sans Thai"', 'serif'],
        body: ['"Noto Sans Thai"', 'Inter', 'sans-serif'],
        sans: ['"Noto Sans Thai"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
