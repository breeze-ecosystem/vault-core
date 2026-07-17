import { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import type { AlertItem } from "@/lib/api";
import { severityColors } from "@/lib/constants";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { AlertTriangle, AlertCircle, Info, OctagonAlert } from "lucide-react-native";

interface AlertCardProps {
  alert: AlertItem;
}

const severityIcons: Record<string, React.ReactNode> = {
  CRITICAL: <OctagonAlert size={16} color="#fff" />,
  HIGH: <AlertTriangle size={16} color="#fff" />,
  MEDIUM: <AlertCircle size={16} color="#fff" />,
  LOW: <AlertCircle size={16} color={colors.text} />,
  INFO: <Info size={16} color={colors.text} />,
};

export const AlertCard = memo(function AlertCard({ alert }: AlertCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const color = severityColors[alert.severity] ?? colors.textMuted;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/alert/${alert.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          {severityIcons[alert.severity] ?? <AlertCircle size={16} color="#fff" />}
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{alert.title}</Text>
          <Text style={styles.camera}>
            {alert.camera?.name ?? t("alerts.unknownCamera")}
          </Text>
        </View>
        <Text style={styles.time}>
          {new Date(alert.createdAt).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
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
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: "500",
  },
  camera: {
    ...typography.small,
    marginTop: 2,
  },
  time: {
    ...typography.small,
    fontSize: 10,
  },
});
