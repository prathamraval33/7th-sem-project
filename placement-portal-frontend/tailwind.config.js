/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Roboto", "system-ui", "sans-serif"],
        body: ["Roboto", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      spacing: {
        "0.2": "0.05rem",
      },
      colors: {
        background: "#FAFAFA",
        foreground: "#0F172A",
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#0052FF",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#0052FF",
          600: "#0045D8",
          700: "#0039B3",
          secondary: "#4D7CFF",
          foreground: "#FFFFFF",
        },
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        error: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
        },
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        border: "#E2E8F0",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        ring: "#0052FF",
        
        // Retaining role colors for dashboard differentiation but adapting them to the new style
        role: {
          student: "#0052FF", // Electric Blue
          tpo: "#4D7CFF", // Lighter Blue
          admin: "#0F172A", // Deep Slate
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        soft: "0 2px 8px -1px rgba(0, 0, 0, 0.08), 0 1px 4px -1px rgba(0, 0, 0, 0.04)",
        sm: "0 1px 3px rgba(0,0,0,0.06)",
        md: "0 4px 6px rgba(0,0,0,0.07)",
        lg: "0 10px 15px rgba(0,0,0,0.08)",
        xl: "0 20px 25px rgba(0,0,0,0.1)",
        accent: "0 4px 14px rgba(0,82,255,0.25)",
        "accent-lg": "0 8px 24px rgba(0,82,255,0.35)",
      },
    },
  },
  plugins: [],
}
