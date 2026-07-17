import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Switch, TouchableOpacity, Alert } from "react-native";
import { fetchAIConfig, updateAIConfig, type AIConfigDto } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Bot, Cpu, Activity, Image, Zap, RefreshCw } from "lucide-react-native";

function formatTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function IaScreen() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AIConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingCapability, setSavingCapability] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchAIConfig();
      setConfig(data);
    } catch (e) {
      setError(t("ia.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleCapability = async (capId: string, currentlyEnabled: boolean) => {
    setSavingCapability(capId);
    try {
      const updated = await updateAIConfig({ capabilities: [{ id: capId, enabled: !currentlyEnabled }] });
      setConfig(updated);
    } catch {
      Alert.alert(t("common.error"), t("ia.loadingError"));
    } finally {
      setSavingCapability(null);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "#22c55e";
      case "degraded": return "#f97316";
      default: return "#ef4444";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerBar}>
        <Bot size={20} color={colors.primary} />
        <Text style={styles.title}>{t("ia.title")}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {config && (
        <>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(config.status) }]} />
              <Text style={styles.statusLabel}>
                {config.status === "online" ? t("ia.online") : config.status === "degraded" ? t("ia.degraded") : t("ia.offline")}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("ia.model")}</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Cpu size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>{config.model}</Text>
              </View>
              <View style={styles.infoRow}>
                <Activity size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>{t("ia.uptime")}: {formatUptime(config.uptime)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Image size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>{t("ia.framesProcessed")}: {config.framesProcessed.toLocaleString()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Zap size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>{t("ia.lastInference")}: {formatTime(config.lastInference)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("ia.capabilities")}</Text>
            {config.capabilities.map(cap => (
              <View key={cap.id} style={styles.capCard}>
                <View style={styles.capInfo}>
                  <Zap size={16} color={cap.enabled ? colors.primary : colors.textMuted} />
                  <Text style={[styles.capName, !cap.enabled && { color: colors.textMuted }]}>{cap.name}</Text>
                </View>
                <Switch
                  value={cap.enabled}
                  onValueChange={() => toggleCapability(cap.id, cap.enabled)}
                  trackColor={{ false: "#333", true: colors.primary + "60" }}
                  thumbColor={cap.enabled ? colors.primary : "#666"}
                  disabled={savingCapability === cap.id}
                />
              </View>
            ))}
          </View>
        </>
      )}

      {!config && !error && (
        <View style={styles.empty}>
          <Cpu size={40} color={colors.border} />
          <Text style={styles.emptyText}>{t("ia.empty")}</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  headerBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  title: { ...typography.h2, flex: 1 },
  errorBox: { padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md, marginBottom: spacing.md },
  errorText: { ...typography.caption, color: colors.destructive },
  statusCard: { backgroundColor: colors.elevated, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { ...typography.body, fontWeight: "600" },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, fontSize: 12, marginBottom: spacing.md },
  infoCard: { backgroundColor: colors.elevated, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  infoText: { ...typography.body, fontSize: 14 },
  capCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, marginBottom: spacing.sm },
  capInfo: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  capName: { ...typography.body, fontWeight: "500" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
});
