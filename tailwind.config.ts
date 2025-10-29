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
        // Glass morphism tokens
        glass: {
          subtle: "rgba(255, 255, 255, 0.03)",
          default: "rgba(255, 255, 255, 0.05)",
          elevated: "rgba(255, 255, 255, 0.10)",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          default: "rgba(255, 255, 255, 0.10)",
          elevated: "rgba(255, 255, 255, 0.15)",
        }
      },
      borderRadius: {
        frame: "28px",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        shimmer: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(99,102,241,0.35)" },
          "70%": { boxShadow: "0 0 0 24px rgba(99,102,241,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(99,102,241,0)" }
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        pulseRing: "pulseRing 2.4s ease-out infinite",
      },
      boxShadow: {
        'elev-1': "0 10px 30px -10px rgba(99,102,241,0.25)",
        'elev-2': "0 20px 60px -18px rgba(99,102,241,0.35)",
      },
      // Glass morphism utilities
      backgroundImage: {
        'glass-subtle': 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'glass-default': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'glass-elevated': 'linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.06) 100%)',
      }
    },
  },
  plugins: [],
} satisfies Config;
