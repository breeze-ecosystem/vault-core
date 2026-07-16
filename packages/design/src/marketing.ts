export const marketingTheme = {
  colors: {
    hero: {
      bg: "from-cyan-950 via-blue-950 to-slate-950",
      gradient: "linear-gradient(135deg, #070912 0%, #06b6d4 100%)",
    },
    surface: {
      card: "#ffffff",
      cardHover: "#f8fafc",
      muted: "#f1f5f9",
    },
    text: {
      primary: "#070912",
      secondary: "#5c6573",
      muted: "#94a3b8",
      inverted: "#ffffff",
    },
    accent: {
      primary: "#06b6d4",
      primaryDark: "#0891b2",
      success: "#10b981",
      warning: "#f59e0b",
      destructive: "#ef4444",
    },
  },
  spacing: {
    section: "py-24 md:py-32",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  },
  typography: {
    display: { fontSize: 40, fontWeight: 600, lineHeight: 1.1 },
    heading: { fontSize: 24, fontWeight: 600, lineHeight: 1.3 },
    body: { fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: 14, fontWeight: 400, lineHeight: 1.4 },
  },
} as const;

export type MarketingTheme = typeof marketingTheme;
