export const marketingTheme = {
  colors: {
    hero: {
      bg: "from-[#070912] via-[#0c1020] to-[#070912]",
      gradient: "linear-gradient(135deg, #070912 0%, #06b6d4 100%)",
    },
    surface: {
      card: "#1a2332",
      cardHover: "#243044",
      muted: "#0c1020",
    },
    text: {
      primary: "#f1f5f9",
      secondary: "#94a3b8",
      muted: "#64748b",
      inverted: "#070912",
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
    display: { fontSize: 56, fontWeight: 600, lineHeight: 1.1 },
    heading: { fontSize: 32, fontWeight: 600, lineHeight: 1.2 },
    body: { fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: 14, fontWeight: 400, lineHeight: 1.4 },
  },
} as const;

export type MarketingTheme = typeof marketingTheme;
