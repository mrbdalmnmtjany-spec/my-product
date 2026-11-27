/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // خط عربي فعلي للهوية "الكتابية" — Playfair القديم مفهوش حروف عربية خالص
        serif: ["'Amiri'", "Georgia", "serif"],
        sans: ["'Cairo'", "system-ui", "sans-serif"],
      },
      colors: {
        room: {
          bg: "#0f1517",
          panel: "#141d20",
          panel2: "#1b2529",
          border: "#2a3538",
          cream: "#f3ead9",
          cream2: "#e9dfc9",
          gold: "#d4af37",
          goldDark: "#b6912b",
          muted: "#a89a7c",
        },
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
