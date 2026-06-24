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
          ink: "#101828",
          panel: "#f8fbff",
          line: "#d8e2f0",
          teal: "#06b6d4",
          amber: "#f97316",
          blue: "#2563eb",
          violet: "#7c3aed",
          pink: "#ec4899",
        },
      },
      backgroundImage: {
        "mytgo-gradient": "linear-gradient(135deg, #2563eb 0%, #06b6d4 44%, #f97316 100%)",
        "mytgo-hero": "radial-gradient(circle at top left, rgba(6,182,212,0.28), transparent 34%), radial-gradient(circle at top right, rgba(249,115,22,0.24), transparent 30%), linear-gradient(135deg, #2563eb 0%, #7c3aed 52%, #ec4899 100%)",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(37, 99, 235, 0.14)",
        glow: "0 24px 70px rgba(6, 182, 212, 0.25)",
      }, 
      backgroundImage: {
        "mytgo-gradient": "linear-gradient(135deg, #7c3aed 0%, #0891b2 45%, #f43f5e 100%)",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(88, 28, 135, 0.12)",
        glow: "0 22px 60px rgba(124, 58, 237, 0.24)",
      },
    },
  },
  plugins: [],
};
