import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, typography } from "@repo/design";
import type { MobileIncidentDto } from "@/lib/api";

interface MobileIncidentCardProps {
  incident: MobileIncidentDto;
  onPress: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#EAB308",
  LOW: "#22C55E",
  INFO: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  triage: "En cours",
  investigating: "Investigation",
  resolved: "Résolu",
  closed: "Fermé",
};

export function MobileIncidentCard({ incident, onPress }: MobileIncidentCardProps) {
  const severityColor = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.INFO;
  const created = new Date(incident.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const timeAgo = diffMins < 60
    ? `Il y a ${diffMins} min`
    : `Il y a ${Math.floor(diffMins / 60)}h`;

  const slaElapsed = Math.round(diffMs / 60000);
  const slaTarget = incident.slaMinutes;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(incident.id)}
      accessibilityLabel={`Incident: ${incident.title}`}
      accessibilityRole="button"
    >
      <View style={[styles.leftBorder, { backgroundColor: severityColor }]} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {incident.title}
        </Text>
        <View style={styles.meta}>
          {incident.zoneName && (
            <Text style={styles.zone}>{incident.zoneName}</Text>
          )}
          <Text style={styles.time}>{timeAgo}</Text>
        </View>
        {slaTarget > 0 && (
          <Text style={styles.sla}>
            ⏱️ SLA: {slaElapsed}/{slaTarget} min
          </Text>
        )}
      </View>
      <View style={styles.badgeContainer}>
        <View style={[styles.statusDot, { backgroundColor: severityColor }]} />
        <Text style={styles.statusText}>
          {STATUS_LABELS[incident.status] || incident.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.dark.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    minHeight: 44,
    overflow: "hidden",
  },
  leftBorder: { width: 4 },
  content: { flex: 1, padding: 12, gap: 4 },
  title: { fontSize: 16, fontWeight: "600", color: colors.dark.text },
  meta: { flexDirection: "row", gap: 8 },
  zone: { fontSize: 13, color: colors.dark.textSecondary },
  time: { fontSize: 13, color: colors.dark.textMuted },
  sla: { fontSize: 12, color: colors.dark.textMuted },
  badgeContainer: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, color: colors.dark.textMuted },
});
