/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Distinct heading/body pairing per the design system — never the
        // Tailwind/Inter-everywhere default.
        heading: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Deep, muted slate-teal — the single dominant brand color.
        brand: {
          50: "#f2f7f6",
          100: "#dfece9",
          200: "#bfd9d3",
          300: "#98c0b7",
          400: "#6fa398",
          500: "#4f8579",
          600: "#3d6b60",
          700: "#33564e",
          800: "#2b4640",
          900: "#253b36",
          950: "#12221f",
          DEFAULT: "#3d6b60",
        },
        // Warm neutrals — never pure #FFFFFF for backgrounds.
        neutral: {
          50: "#faf8f5",
          100: "#f4f0ea",
          200: "#e8e1d6",
          300: "#d7cdbd",
          400: "#b7aa96",
          500: "#948572",
          600: "#756a5a",
          700: "#5c5346",
          800: "#423c33",
          900: "#2b2721",
          950: "#18150f",
        },
        // One restrained accent, used sparingly for key CTAs only.
        accent: {
          50: "#fdf6ec",
          100: "#faebd2",
          200: "#f3d3a3",
          300: "#ecb86d",
          400: "#e39f42",
          500: "#d6842a",
          600: "#b6661f",
          700: "#924e1c",
          800: "#77401d",
          900: "#64371b",
          DEFAULT: "#d6842a",
        },
        // Desaturated status colors (never neon).
        success: {
          50: "#f1f6f2",
          100: "#dcebe0",
          500: "#5f8f6e",
          600: "#4b7359",
          700: "#3d5c48",
        },
        warning: {
          50: "#faf4e8",
          100: "#f1e3c2",
          500: "#b8923f",
          600: "#977633",
          700: "#785e29",
        },
        error: {
          50: "#f8efec",
          100: "#efd7cf",
          500: "#b6543f",
          600: "#974634",
          700: "#7a382a",
        },
        // Subtly distinct per-role accent within the same overall palette —
        // student keeps the primary brand hue, tpo/admin get a related but
        // distinguishable hue so it's immediately clear which dashboard is
        // active.
        role: {
          student: "#3d6b60", // brand teal
          tpo: "#4f5f80", // muted slate-blue
          admin: "#7a4a5c", // muted plum
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(24, 21, 15, 0.04), 0 2px 8px -2px rgba(24, 21, 15, 0.08)",
        softer: "0 1px 3px 0 rgba(24, 21, 15, 0.03)",
      },
    },
  },
  plugins: [],
}

