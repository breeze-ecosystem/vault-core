import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { colors, typography } from "@repo/design";
import { fetchMobileIncident, updateMobileIncidentStatus, type MobileIncidentDto } from "@/lib/api";

const VALID_TRANSITIONS: Record<string, { next: string; label: string }[]> = {
  open: [{ next: "triage", label: "Accuser réception" }],
  triage: [{ next: "investigating", label: "Investiguer" }],
  investigating: [{ next: "resolved", label: "Résoudre" }],
  resolved: [{ next: "closed", label: "Fermer" }],
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#EAB308",
  LOW: "#22C55E",
  INFO: "#6B7280",
};

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [incident, setIncident] = useState<MobileIncidentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMobileIncident(id);
        setIncident(data);
      } catch (err: any) {
        setError(err.message || "Impossible de charger l'incident");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleTransition = async (nextStatus: string) => {
    setTransitioning(true);
    try {
      await updateMobileIncidentStatus(id, nextStatus);
      if (incident) {
        setIncident({ ...incident, status: nextStatus });
      }
    } catch {
      setError("Échec de la mise à jour");
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Incident" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.dark.text} />
        </View>
      </View>
    );
  }

  if (error || !incident) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Incident" }} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || "Incident introuvable"}</Text>
          <TouchableOpacity style={styles.retryButton}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const transitions = VALID_TRANSITIONS[incident.status] || [];
  const severityColor = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.INFO;
  const created = new Date(incident.createdAt);
  const elapsed = Math.round((Date.now() - created.getTime()) / 60000);
  const slaColor = elapsed >= incident.slaMinutes ? "#EF4444" : elapsed >= incident.slaMinutes * 0.5 ? "#EAB308" : "#22C55E";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `#${incident.id.substring(0, 8)}` }} />
      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
            <Text style={styles.severityText}>{incident.severity}</Text>
          </View>
          <Text style={styles.title}>{incident.title}</Text>
        </View>

        <View style={styles.detailSection}>
          <DetailRow label="ID incident" value={`#${incident.id.substring(0, 8)}`} />
          <DetailRow label="Statut" value={incident.status} />
          {incident.zoneName && <DetailRow label="Zone" value={incident.zoneName} />}
          <DetailRow
            label="Créé le"
            value={created.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        </View>

        <View style={styles.slaSection}>
          <Text style={styles.slaLabel}>⏱️ SLA</Text>
          <Text style={[styles.slaValue, { color: slaColor }]}>
            {elapsed}/{incident.slaMinutes} min
          </Text>
          <View style={[styles.slaBar, { backgroundColor: colors.dark.border }]}>
            <View
              style={[
                styles.slaFill,
                {
                  backgroundColor: slaColor,
                  width: `${Math.min(100, (elapsed / incident.slaMinutes) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        {transitions.length > 0 && (
          <View style={styles.actions}>
            {transitions.map((t) => (
              <TouchableOpacity
                key={t.next}
                style={styles.actionButton}
                onPress={() => handleTransition(t.next)}
                disabled={transitioning}
                accessibilityLabel={`Passer au statut ${t.label}`}
                accessibilityRole="button"
              >
                {transitioning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionText}>{t.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 16 },
  errorText: { fontSize: 14, color: colors.dark.textSecondary, textAlign: "center" },
  retryButton: {
    backgroundColor: colors.dark.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  retryText: { fontSize: 14, fontWeight: "600", color: colors.dark.text },
  header: {
    padding: 24,
    gap: 12,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  severityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  title: { fontSize: 20, fontWeight: "600", color: colors.dark.text },
  detailSection: { padding: 24, gap: 12 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  detailLabel: { fontSize: 14, color: colors.dark.textSecondary },
  detailValue: { fontSize: 14, fontWeight: "500", color: colors.dark.text },
  slaSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: colors.dark.surface,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  slaLabel: { fontSize: 14, fontWeight: "600", color: colors.dark.text },
  slaValue: { fontSize: 16, fontWeight: "700" },
  slaBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  slaFill: { height: "100%", borderRadius: 3 },
  actions: { padding: 24, gap: 12 },
  actionButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  actionText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
