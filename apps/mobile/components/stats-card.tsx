import { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}

export const StatsCard = memo(function StatsCard({ title, value, subtitle, color }: StatsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  value: {
    ...typography.display,
  },
  title: {
    ...typography.caption,
    marginTop: 2,
  },
  subtitle: {
    ...typography.small,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
