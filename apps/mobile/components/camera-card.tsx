import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import type { CameraItem } from "@/lib/api";

const statusColors: Record<string, string> = {
  ONLINE: "#22c55e",
  OFFLINE: "#dc2626",
  MAINTENANCE: "#f97316",
  DEGRADED: "#eab308",
};

const statusLabels: Record<string, string> = {
  ONLINE: "En ligne",
  OFFLINE: "Hors ligne",
  MAINTENANCE: "Maintenance",
  DEGRADED: "Degrade",
};

interface CameraCardProps {
  camera: CameraItem;
}

export function CameraCard({ camera }: CameraCardProps) {
  const router = useRouter();
  const color = statusColors[camera.status] ?? "#6b7280";
  const label = statusLabels[camera.status] ?? camera.status;

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/camera/${camera.id}`)} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={styles.name} numberOfLines={1}>
          {camera.name}
        </Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.detail}>
          {camera.site?.name ?? "Site inconnu"}
        </Text>
        <Text style={[styles.statusBadge, { color }]}>
          {label}
        </Text>
      </View>
      {camera.resolution && (
        <Text style={styles.resolution}>{camera.resolution} · {camera.fps} fps</Text>
      )}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "500",
    color: "#ededed",
    flex: 1,
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  detail: {
    fontSize: 13,
    color: "#888",
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: "600",
  },
  resolution: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
});
