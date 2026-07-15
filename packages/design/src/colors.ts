export const colors = {
  dark: {
    bg: "#070912",
    surface: "#0c1020",
    elevated: "#1a2332",
    border: "#1e293b",
    borderLight: "#334155",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    glassBg: "rgba(12,16,32,0.7)",
  },
  light: {
    bg: "#ffffff",
    surface: "#f5f7fa",
    elevated: "#ffffff",
    border: "#e2e8f0",
    borderLight: "#cbd5e1",
    text: "#070912",
    textSecondary: "#5c6573",
    textMuted: "#94a3b8",
    glassBg: "rgba(245,247,250,0.7)",
  },
  shared: {
    primary: "#06b6d4",
    primaryDark: "#0891b2",
    success: "#10b981",
    warning: "#f59e0b",
    destructive: "#ef4444",
    info: "#06b6d4",
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorPalette = typeof colors;
