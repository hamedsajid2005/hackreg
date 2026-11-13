import type { Config } from "tailwindcss";

/**
 * Palette derived directly from the official Zelvora Technologies logo:
 *   cyan   #06F4ED / #28FCF8   (Z mark, upper)
 *   teal   #01F6D3             (Z mark, left gradient)
 *   azure  #009DBE / #00A4C2   (Z mark, lower)
 * The logo artwork sits on a pure black plate, so the interface is built on a
 * near-black canvas — this keeps the mark legible without recolouring it.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", lg: "2rem" },
      screens: { "2xl": "1200px" },
    },
    extend: {
      colors: {
        brand: {
          50: "#E6FFFC",
          100: "#C2FFF7",
          200: "#8CFBEE",
          300: "#4DF4E2",
          400: "#22F0E4",
          500: "#06F4ED",
          600: "#01D8D6",
          700: "#00A4C2",
          800: "#0E7FB5",
          900: "#0B5E86",
        },
        ink: {
          950: "#04070B",
          900: "#070C12",
          850: "#0A1118",
          800: "#0E1620",
          700: "#16202C",
          600: "#1F2B39",
        },
        line: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg,#01F6D3 0%,#06F4ED 38%,#00A4C2 72%,#0E7FB5 100%)",
        "brand-soft": "linear-gradient(135deg,rgba(1,246,211,0.14),rgba(14,127,181,0.10))",
        "grid-fade":
          "linear-gradient(to right,rgba(255,255,255,0.045) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.045) 1px,transparent 1px)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(6,244,237,0.20), 0 18px 60px -20px rgba(6,244,237,0.35)",
        card: "0 24px 70px -32px rgba(0,0,0,0.85)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(.22,1,.36,1) both",
        float: "float 7s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "accordion-down": "accordion-down .28s cubic-bezier(.22,1,.36,1)",
        "accordion-up": "accordion-up .22s cubic-bezier(.22,1,.36,1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
