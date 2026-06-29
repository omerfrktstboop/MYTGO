/** @type {import('tailwindcss').Config} */
export default {
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
        "mytgo-gradient": "linear-gradient(135deg, #7c3aed 0%, #0891b2 45%, #f43f5e 100%)",
        "mytgo-hero": "radial-gradient(circle at 15% 10%, rgba(182,255,92,0.38), transparent 24%), radial-gradient(circle at top right, rgba(249,115,22,0.32), transparent 30%), linear-gradient(135deg, #2563eb 0%, #7c3aed 52%, #ec4899 100%)",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(88, 28, 135, 0.12)",
        glow: "0 22px 60px rgba(124, 58, 237, 0.24)",
        neon: "0 18px 48px rgba(182, 255, 92, 0.28)",
      },
    },
  },
  plugins: [],
};
