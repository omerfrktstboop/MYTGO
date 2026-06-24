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
          ink: "#171717",
          panel: "#f7f7f2",
          line: "#d9d8cc",
          teal: "#0f766e",
          amber: "#d97706",
        },
      },
      boxShadow: {
        soft: "0 16px 40px rgba(23, 23, 23, 0.10)",
      },
    },
  },
  plugins: [],
};
