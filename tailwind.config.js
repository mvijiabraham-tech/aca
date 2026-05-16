/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Tight"', "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ['"Source Serif Pro"', "ui-serif", "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // Navy — primary text and structural elements
        navy: {
          50: "#F5F7FA",
          100: "#E8EDF3",
          200: "#CBD5E1",
          300: "#94A3B8",
          500: "#475569",
          700: "#1E293B",
          900: "#0F172A",
        },
        // Ocean — primary accent / action
        ocean: {
          50: "#ECFEFF",
          100: "#CFFAFE",
          300: "#67E8F9",
          500: "#06B6D4",
          600: "#0891B2",
          700: "#0E7490",
          800: "#155E75",
        },
        // Ink — body text and muted surfaces
        ink: {
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          700: "#334155",
        },
        // Amber for warnings / open items
        amber: {
          50: "#FFFBEB",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        // Green for complete/success states
        green: {
          50: "#F0FDF4",
          300: "#86EFAC",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
        // Red — kept reserved for hard errors only
        red: {
          50: "#FEF2F2",
          300: "#FCA5A5",
          600: "#DC2626",
          700: "#B91C1C",
        },
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.025em" }],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        cardHover: "0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
      },
    },
  },
  plugins: [],
};
