import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Switch } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchRetentionPolicies, updateRetentionPolicy, fetchGovernanceStatus, type RetentionPolicyDto, type GovernanceStatusDto } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Shield, ShieldCheck, Lock, RefreshCw } from "lucide-react-native";

const EVENT_TYPE_LABELS: Record<string, string> = {
  access_events: "Événements d'accès",
  door_state_log: "Journal portes",
  audit_log: "Journal d'audit",
  incident_events: "Incidents",
  vehicle_events: "Véhicules",
  reader_health: "Santé lecteurs",
  controller_health: "Santé contrôleurs",
  camera_health: "Santé caméras",
};

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function GouvernanceScreen() {
  const { t } = useTranslation();
  const [policies, setPolicies] = useState<RetentionPolicyDto[]>([]);
  const [govStatus, setGovStatus] = useState<GovernanceStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [polData, statusData] = await Promise.all([
        fetchRetentionPolicies().catch(() => []),
        fetchGovernanceStatus().catch(() => null),
      ]);
      setPolicies(Array.isArray(polData) ? polData : []);
      setGovStatus(statusData);
    } catch (e) {
      setError(t("gouvernance.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const togglePolicy = async (policy: RetentionPolicyDto) => {
    setTogglingIds(prev => new Set(prev).add(policy.id));
    try {
      const updated = await updateRetentionPolicy(policy.id, { enabled: !policy.enabled });
      setPolicies(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch {
      setError(t("gouvernance.loadingError"));
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(policy.id); return next; });
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <ShieldCheck size={20} color={colors.primary} />
        <Text style={styles.title}>{t("gouvernance.title")}</Text>
      </View>

      {govStatus && (
        <View style={styles.statusCard}>
          <Lock size={16} color={govStatus.encryptionConfigured ? colors.success : colors.warning} />
          <Text style={styles.statusText}>
            {govStatus.encryptionConfigured ? "Chiffrement actif" : "Chiffrement non configuré"}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh}>
            <RefreshCw size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <FlashList
        data={policies}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.cardLeft, { backgroundColor: item.enabled ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.1)" }]}>
              <Shield size={20} color={item.enabled ? "#22c55e" : colors.textMuted} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.policyName}>{EVENT_TYPE_LABELS[item.eventType] || item.eventType}</Text>
              <Text style={styles.policyMeta}>
                {t("gouvernance.retention")}: {item.retentionDays} jours · {item.tableType}
              </Text>
              <Text style={styles.policyDate}>
                {t("gouvernance.updatedAt")}: {formatDate(item.updatedAt)}
              </Text>
            </View>
            <Switch
              value={item.enabled}
              onValueChange={() => togglePolicy(item)}
              trackColor={{ false: "#333", true: colors.primary + "60" }}
              thumbColor={item.enabled ? colors.primary : "#666"}
              disabled={togglingIds.has(item.id)}
            />
          </View>
        )}
        estimatedItemSize={90}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ShieldCheck size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("gouvernance.empty")}</Text>
          </View>
        }
        ListFooterComponent={() => <View style={{ height: 24 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  headerBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.h2, flex: 1 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  statusText: { ...typography.caption, fontSize: 13 },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  errorBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md },
  errorText: { ...typography.caption, color: colors.destructive, flex: 1 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md },
  cardLeft: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  cardContent: { flex: 1 },
  policyName: { ...typography.body, fontWeight: "600" },
  policyMeta: { ...typography.small, marginTop: 2 },
  policyDate: { ...typography.small, color: colors.textMuted, marginTop: 1 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
});
