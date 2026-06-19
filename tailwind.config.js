/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        panel: "#0d1a2d",
        cyan: "#4de1c1",
        blue: "#6aa7ff",
      },
      boxShadow: {
        glow: "0 0 40px rgba(77, 225, 193, 0.12)",
      },
    },
  },
  plugins: [],
};

