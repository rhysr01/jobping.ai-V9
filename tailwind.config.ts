import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1", // primary
          600: "#4F46E5", // hover/pressed
        },
      },
      borderRadius: {
        frame: "28px",
      },
    },
  },
  plugins: [],
} satisfies Config;
