import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        background: "hsl(var(--shadcn-background))",
        foreground: "hsl(var(--shadcn-foreground))",
        card: {
          DEFAULT: "hsl(var(--shadcn-card))",
          foreground: "hsl(var(--shadcn-card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--shadcn-popover))",
          foreground: "hsl(var(--shadcn-popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--shadcn-primary))",
          foreground: "hsl(var(--shadcn-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--shadcn-secondary))",
          foreground: "hsl(var(--shadcn-secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--shadcn-muted))",
          foreground: "hsl(var(--shadcn-muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--shadcn-accent))",
          foreground: "hsl(var(--shadcn-accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--shadcn-destructive))",
          foreground: "hsl(var(--shadcn-destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--shadcn-warning))",
          foreground: "hsl(var(--shadcn-warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--shadcn-success))",
          foreground: "hsl(var(--shadcn-success-foreground))",
        },
        border: "hsl(var(--shadcn-border))",
        input: "hsl(var(--shadcn-input))",
        ring: "hsl(var(--shadcn-ring))",
      },
      borderRadius: {
        lg: "var(--shadcn-radius)",
        md: "calc(var(--shadcn-radius) - 2px)",
        sm: "calc(var(--shadcn-radius) - 4px)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "data-flow": "dataFlow 3s linear infinite",
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
        dataFlow: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "100% 0%" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
