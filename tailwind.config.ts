import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    fontFamily: {
      sans: ["Satoshi", "Inter", "system-ui", "sans-serif"],
    },
    extend: {
      // Spacing removed - Tailwind defaults are sufficient
      colors: {
        brand: {
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA", // Added for completeness
          500: "#6D28D9", // Deep rich dark purple
          600: "#5B21B6",
          700: "#4C1D95",
        },
        // Semantic color system
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          600: "#d97706",
        },
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          600: "#dc2626",
        },
        info: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
        },
        // Neutral gray ramp
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        // Semantic text colors (using "content" to avoid double "text" in class names)
        // Usage: text-content-primary, text-content-secondary, etc.
        content: {
          primary: "#ffffff", // White - main headings
          secondary: "#d4d4d8", // zinc-300 - body text
          muted: "#a1a1aa", // zinc-400 - secondary text
          disabled: "#71717a", // zinc-500 - disabled/muted
          heading: "#f4f4f5", // zinc-100 - section headings
          accent: "#c4b5fd", // brand-300 - accents
        },
        // Semantic surface colors
        surface: {
          base: "#09090b", // zinc-950 - base background
          elevated: "#18181b", // zinc-900 - elevated surfaces
          card: "rgba(255, 255, 255, 0.05)", // glass cards
          hover: "rgba(255, 255, 255, 0.08)", // hover states
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
        },
      },
      borderRadius: {
        frame: "28px",
        card: "1rem", // 16px - standardized card radius (use rounded-card)
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(99,102,241,0.35)" },
          "70%": { boxShadow: "0 0 0 24px rgba(99,102,241,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(99,102,241,0)" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        pulseRing: "pulseRing 2.4s ease-out infinite",
      },
      scale: {
        "102": "1.02",
        "98": "0.98",
      },
      // Typography system - Tight, cohesive scale
      fontSize: {
        display: ["3rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }], // 48px - Hero headlines
        heading: ["1.875rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }], // 30px - Section headings
        large: ["1.125rem", { lineHeight: "1.6", letterSpacing: "0" }], // 18px - Emphasis text
        body: ["1rem", { lineHeight: "1.6", letterSpacing: "0" }], // 16px - Body text
        small: ["0.875rem", { lineHeight: "1.5", letterSpacing: "0" }], // 14px - Small text
      },
      // Depth system - simplified
      boxShadow: {
        base: "0 1px 2px 0 rgb(255 255 255 / 0.05)",
        raised:
          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        overlay:
          "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "elev-1": "0 10px 30px -10px rgba(109,40,217,0.2)",
        "elev-2": "0 20px 60px -18px rgba(109,40,217,0.25)",
        // Reduced glow utilities - use sparingly
        "glow-subtle": "0 0 12px rgba(109,40,217,0.15)",
        "glow-strong": "0 0 24px rgba(109,40,217,0.2)",
      },
      // Micro-interaction timing
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
      },
      // Glass morphism utilities
      backgroundImage: {
        "glass-subtle":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "glass-default":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
        "glass-elevated":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.06) 100%)",
        "gradient-radial": "radial-gradient(circle, var(--tw-gradient-stops))",
        // Standardized brand gradients (accessibility-checked for contrast)
        // Primary brand gradient - high contrast for hero text/CTAs
        "gradient-brand":
          "linear-gradient(to right, rgba(139,92,246,0.9) 0%, rgba(244,244,245,1) 50%, rgba(139,92,246,0.9) 100%)",
        // Subtle glass gradient - for cards and backgrounds
        "gradient-glass":
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        // Accent gradient - use sparingly for highlights (purple to emerald)
        "gradient-accent":
          "linear-gradient(to right, rgba(139,92,246,0.7), rgba(16,185,129,0.7))",
      },
      // Standardized spacing scale
      spacing: {
        section: "5rem", // py-section for section padding (80px)
        container: "1.5rem", // px-container for container padding (24px)
      },
    },
  },
  plugins: [],
} satisfies Config;
