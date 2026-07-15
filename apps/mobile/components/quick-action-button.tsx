import { Pressable, Text, View, StyleSheet } from "react-native";
import { colors } from "@repo/design";
import React from "react";

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
}

export const QuickActionButton = React.memo(function QuickActionButton({
  icon,
  label,
  onPress,
  color = colors.shared.primary,
}: QuickActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrapper,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconContainer, { borderColor: colors.dark.border }]}>
        {icon}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 6,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: colors.dark.elevated,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.dark.textSecondary,
    textAlign: "center",
  },
});
