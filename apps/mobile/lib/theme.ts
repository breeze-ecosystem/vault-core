import { StyleSheet } from "react-native";
import { colors as designColors, typography as designTypography, spacing as designSpacing } from "@repo/design";

// Flat color export for backward compatibility with existing Mobile screens
// Values sourced from @repo/design/src/colors.ts (canonical)
export const colors = {
  bg: designColors.dark.bg,
  surface: designColors.dark.surface,
  elevated: designColors.dark.elevated,
  border: designColors.dark.border,
  borderLight: designColors.dark.borderLight,
  text: designColors.dark.text,
  textSecondary: designColors.dark.textSecondary,
  textMuted: designColors.dark.textMuted,
  primary: designColors.shared.primary,
  primaryDark: designColors.shared.primaryDark,
  success: designColors.shared.success,
  warning: designColors.shared.warning,
  destructive: designColors.shared.destructive,
  info: designColors.shared.info,
  overlay: "rgba(0,0,0,0.5)",
  glassBg: designColors.dark.glassBg,
};

// Canonical 4-size typography from @repo/design
// Transitional aliases (h1, h2, h3, caption, small) kept for backward compat
export const typography = {
  display: { ...designTypography.display, color: colors.text },
  heading: { ...designTypography.heading, color: colors.text },
  body: { ...designTypography.body, color: colors.text },
  label: { ...designTypography.label, color: colors.textMuted, letterSpacing: 1 },
  // Transitional aliases — derived from canonical scale
  h1: { ...designTypography.display, color: colors.text, letterSpacing: -0.5 },
  h2: { ...designTypography.heading, color: colors.text },
  h3: { fontSize: 16, fontWeight: "600" as const, color: colors.text, lineHeight: 1.3 },
  caption: { fontSize: 13, color: colors.textSecondary },
  small: { fontSize: 11, color: colors.textMuted },
};

// Canonical spacing from @repo/design — 9-step scale
export const spacing = {
  xs: designSpacing.xs,
  sm: designSpacing.sm,
  md: designSpacing.md,
  base: designSpacing.base,
  lg: designSpacing.lg,
  xl: designSpacing.xl,
  xxl: designSpacing.xxl,
  xxxl: designSpacing.xxxl,
  xxxxl: designSpacing.xxxxl,
};

// Mobile-specific overrides (validated against UI-SPEC)
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
