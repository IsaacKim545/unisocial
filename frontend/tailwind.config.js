/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0edff",
          100: "#ddd6fe",
          200: "#c4b5fd",
          300: "#a78bfa",
          400: "#8b6cf7",
          500: "#7c5ce6",
          600: "#6a4dd4",
          700: "#5738b8",
          800: "#462d96",
          900: "#362475",
        },
        surface: {
          0: "#ffffff",
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#0a0e17",
        },
        success: { DEFAULT: "#22c55e", light: "#dcfce7" },
        warn: { DEFAULT: "#f59e0b", light: "#fef3c7" },
        danger: { DEFAULT: "#ef4444", light: "#fee2e2" },
      },
      fontFamily: {
        display: ['"DM Sans"', "system-ui", "sans-serif"],
        body: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        soft: "0 2px 12px rgba(0,0,0,.06)",
        card: "0 1px 4px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.04)",
        glow: "0 0 24px rgba(124,92,230,.15)",
      },
      animation: {
        "slide-up": "slideUp .4s cubic-bezier(.16,1,.3,1)",
        "fade-in": "fadeIn .3s ease-out",
        "scale-in": "scaleIn .25s cubic-bezier(.16,1,.3,1)",
      },
      keyframes: {
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: "scale(.96)" }, to: { opacity: 1, transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
};
