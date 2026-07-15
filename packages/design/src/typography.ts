export const typography = {
  display: { fontSize: 28, fontWeight: 600, lineHeight: 1.2 },
  heading: { fontSize: 20, fontWeight: 600, lineHeight: 1.2 },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  label: { fontSize: 12, fontWeight: 600, lineHeight: 1.2 },
  mono: { fontSize: 24, fontWeight: 600, fontVariant: ["tabular-nums"] as const },
  monoSmall: { fontSize: 14, fontWeight: 600, fontVariant: ["tabular-nums"] as const },
} as const;

export type TypographyScale = typeof typography;
