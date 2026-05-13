import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import type { AlertItem } from "@/lib/api";

const severityColors: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
  INFO: "#6b7280",
};

interface AlertCardProps {
  alert: AlertItem;
}

export function AlertCard({ alert }: AlertCardProps) {
  const router = useRouter();
  const color = severityColors[alert.severity] ?? "#6b7280";

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/alert/${alert.id}`)} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{alert.severity}</Text>
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
      <Text style={styles.title} numberOfLines={2}>
        {alert.title}
      </Text>
      <Text style={styles.camera}>
        {alert.camera?.name ?? "Camera inconnue"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    color: "#888",
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ededed",
  },
  camera: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
});
