import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'media',
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        display: ["40px", { lineHeight: "1.1", fontWeight: "600" }],
      },
      colors: {
        background: "hsl(var(--marketing-bg))",
        foreground: "hsl(var(--marketing-foreground))",
        muted: {
          DEFAULT: "hsl(var(--marketing-muted))",
          light: "hsl(var(--marketing-muted-light))",
        },
        border: "hsl(var(--marketing-border))",
        "border-strong": "hsl(var(--marketing-border-strong))",
        primary: {
          DEFAULT: "hsl(var(--marketing-primary))",
          foreground: "hsl(var(--marketing-primary-foreground))",
          hover: "hsl(var(--marketing-primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--marketing-bg-secondary))",
        },
        ring: "hsl(var(--marketing-ring))",
        success: "hsl(var(--marketing-success))",
        destructive: "hsl(var(--marketing-destructive))",
        warning: "hsl(var(--marketing-warning))",
        dark: {
          DEFAULT: "hsl(var(--marketing-bg-dark))",
          foreground: "hsl(var(--marketing-primary-foreground))",
        },
      },
      borderRadius: {
        sm: "var(--marketing-radius-sm)",
        DEFAULT: "var(--marketing-radius)",
        lg: "var(--marketing-radius-lg)",
        xl: "var(--marketing-radius-xl)",
      },
      maxWidth: {
        container: "var(--marketing-container)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-up": "fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
