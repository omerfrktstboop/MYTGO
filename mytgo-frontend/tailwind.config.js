/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        mytgo: {
          ink: "rgb(var(--mytgo-ink-rgb) / <alpha-value>)",
          muted: "rgb(var(--mytgo-muted-rgb) / <alpha-value>)",
          panel: "rgb(var(--mytgo-panel-rgb) / <alpha-value>)",
          line: "rgb(var(--mytgo-line-rgb) / <alpha-value>)",
          lime: "rgb(var(--mytgo-lime-rgb) / <alpha-value>)",
          teal: "rgb(var(--mytgo-teal-rgb) / <alpha-value>)",
          amber: "rgb(var(--mytgo-amber-rgb) / <alpha-value>)",
          blue: "rgb(var(--mytgo-blue-rgb) / <alpha-value>)",
          violet: "rgb(var(--mytgo-violet-rgb) / <alpha-value>)",
          pink: "rgb(var(--mytgo-pink-rgb) / <alpha-value>)",
        },
      },
      backgroundImage: {
        "mytgo-gradient": "linear-gradient(135deg, #dc2626 0%, #991b1b 58%, #111827 100%)",
        "mytgo-hero": "linear-gradient(135deg, #dc2626 0%, #b91c1c 48%, #111827 100%)",
      },
      boxShadow: {
        soft: "0 18px 44px rgba(127, 29, 29, 0.10)",
        glow: "0 24px 60px rgba(185, 28, 28, 0.22)",
        neon: "0 18px 48px rgba(220, 38, 38, 0.22)",
      },
    },
  },
  plugins: [],
};
