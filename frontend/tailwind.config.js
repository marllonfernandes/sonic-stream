/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        moises: {
          bg: "#0B0F19", // Deep Navy Background
          surface: "#181C28", // Card/Surface Color
          accent: "#3B82F6", // Electric Blue
          secondary: "#64748B", // Muted Text
          text: "#F8FAFC", // Main Text
          border: "#2D3748", // Border Color
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
