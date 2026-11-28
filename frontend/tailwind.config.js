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
          bg: "#F3F6FA",
          panel: "#FFFFFF",
          panel2: "#F7FAFD",
          text: "#293B52",
          border: "#DCE6F2",
          cream: "#293B52",
          cream2: "#E7EEF7",
          gold: "#6686AD",
          goldDark: "#4F7098",
          muted: "#718096",
        },
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
