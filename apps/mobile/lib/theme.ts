import { StyleSheet } from "react-native";

export const colors = {
  bg: "#0a0e17",
  surface: "#111827",
  elevated: "#1a2332",
  border: "#1e293b",
  borderLight: "#334155",
  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  primary: "#06b6d4",
  primaryDark: "#0891b2",
  success: "#10b981",
  warning: "#f59e0b",
  destructive: "#ef4444",
  info: "#8b5cf6",
  overlay: "rgba(0,0,0,0.5)",
  glassBg: "rgba(17,24,39,0.7)",
};

export const typography = {
  h1: { fontSize: 24, fontWeight: "700" as const, color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: "600" as const, color: colors.text, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  caption: { fontSize: 13, color: colors.textSecondary },
  small: { fontSize: 11, color: colors.textMuted },
  mono: { fontSize: 24, fontWeight: "600" as const, color: colors.text, fontVariant: ["tabular-nums" as any] },
  monoSmall: { fontSize: 14, fontWeight: "600" as const, color: colors.text, fontVariant: ["tabular-nums" as any] },
  label: { fontSize: 11, fontWeight: "600" as const, color: colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 1 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
};

export function createStyles<T extends StyleSheet.NamedStyles<T>>(styles: T | StyleSheet.NamedStyles<T>) {
  return StyleSheet.create(styles);
}
