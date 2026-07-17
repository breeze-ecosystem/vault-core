import { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import type { CameraItem } from "@/lib/api";
import { statusColors, statusLabels } from "@/lib/constants";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Camera } from "lucide-react-native";

interface CameraCardProps {
  camera: CameraItem;
}

export const CameraCard = memo(function CameraCard({ camera }: CameraCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const color = statusColors[camera.status] ?? colors.textMuted;
  const label = t(`common.statusLabels.${camera.status?.toLowerCase()}`) || statusLabels[camera.status] || camera.status;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/camera/${camera.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Camera size={18} color={colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>{camera.name}</Text>
          <Text style={styles.site}>
            {camera.site?.name ?? t("cameras.unknownSite")}
          </Text>
        </View>
        <View style={styles.statusWrap}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{label}</Text>
        </View>
      </View>
      {camera.resolution && (
        <View style={styles.footer}>
          <Text style={styles.resolution}>{camera.resolution}</Text>
          <Text style={styles.fps}>{camera.fps} fps</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(6,182,212,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: "500",
  },
  site: {
    ...typography.small,
    marginTop: 2,
  },
  statusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.small,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resolution: {
    ...typography.small,
    fontSize: 11,
  },
  fps: {
    ...typography.small,
    fontSize: 11,
  },
});
