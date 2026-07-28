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
      colors: {
        background: "#FAFAFA",
        foreground: "#0F172A",
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#0052FF",
          secondary: "#4D7CFF",
          foreground: "#FFFFFF",
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
