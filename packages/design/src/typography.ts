export const typography = {
  /// 4-size canonical scale: display (28px), heading (20px), body (14px), label (12px)
  display: { fontSize: 28, fontWeight: 600, lineHeight: 1.2 },
  heading: { fontSize: 20, fontWeight: 600, lineHeight: 1.2 },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  label: { fontSize: 12, fontWeight: 600, lineHeight: 1.2 },
} as const;

// Monospace is a font-family variant applied at existing sizes, NOT a separate size:
//   - Stat values: use `heading` (20px) + 'JetBrains Mono' font-family + weight 600
//   - Data readouts, FPS, counters: use `body` (14px) + 'JetBrains Mono' font-family + weight 600 + tabular-nums
// No unique font-size — just a font-family override.

export type TypographyScale = typeof typography;
