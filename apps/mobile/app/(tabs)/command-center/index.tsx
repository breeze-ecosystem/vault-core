import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { fetchCommandCenterStatus, fetchDashboardStats, type CommandCenterStatus, type DashboardStats } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { useRouter } from "expo-router";
import { Activity, Camera, AlertTriangle, DoorOpen, Shield, ChevronRight } from "lucide-react-native";

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function CommandCenterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [status, setStatus] = useState<CommandCenterStatus | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [ccData, statsData] = await Promise.all([
        fetchCommandCenterStatus().catch(() => null),
        fetchDashboardStats().catch(() => null),
      ]);
      setStatus(ccData);
      setStats(statsData);
    } catch (e) {
      setError(t("commandCenter.loadingError"));
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

  const activeAlerts = status?.activeAlerts ?? stats?.alerts.open ?? 0;
  const onlineCameras = status?.onlineCameras ?? stats?.cameras.online ?? 0;
  const totalCameras = status?.totalCameras ?? stats?.cameras.total ?? 0;
  const doorStates = status?.doorStates ?? { locked: 0, unlocked: 0, open: 0 };
  const recentEvents = status?.recentEvents ?? [];

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerBar}>
        <Activity size={20} color={colors.primary} />
        <Text style={styles.title}>{t("commandCenter.title")}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <AlertTriangle size={20} color={colors.destructive} />
          <Text style={styles.statValue}>{activeAlerts}</Text>
          <Text style={styles.statLabel}>{t("commandCenter.activeAlerts")}</Text>
        </View>
        <View style={styles.statCard}>
          <Camera size={20} color={colors.primary} />
          <Text style={styles.statValue}>{onlineCameras}/{totalCameras}</Text>
          <Text style={styles.statLabel}>{t("commandCenter.onlineCameras")}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)" }]}>
          <DoorOpen size={20} color="#22c55e" />
          <Text style={styles.statValue}>{doorStates.locked}</Text>
          <Text style={[styles.statLabel, { color: "#22c55e" }]}>{t("commandCenter.locked")}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "rgba(250,204,21,0.1)", borderColor: "rgba(250,204,21,0.3)" }]}>
          <DoorOpen size={20} color="#eab308" />
          <Text style={styles.statValue}>{doorStates.unlocked}</Text>
          <Text style={[styles.statLabel, { color: "#eab308" }]}>{t("commandCenter.unlocked")}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t("commandCenter.recentEvents")}</Text>
      {recentEvents.length === 0 ? (
        <View style={styles.emptySection}>
          <Activity size={32} color={colors.border} />
          <Text style={styles.emptyText}>{t("commandCenter.empty")}</Text>
        </View>
      ) : (
        recentEvents.slice(0, 10).map(evt => (
          <View key={evt.id} style={styles.eventCard}>
            <View style={[styles.eventDot, { backgroundColor: evt.type === "alert" ? colors.destructive : colors.primary }]} />
            <View style={styles.eventContent}>
              <Text style={styles.eventSummary} numberOfLines={1}>{evt.summary}</Text>
              <Text style={styles.eventTime}>{formatTime(evt.timestamp)}</Text>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>{t("commandCenter.quickActions")}</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/(tabs)/cameras" as any)}>
          <Camera size={24} color={colors.primary} />
          <Text style={styles.actionLabel}>{t("commandCenter.viewCameras")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/(tabs)/incidents" as any)}>
          <AlertTriangle size={24} color={colors.warning} />
          <Text style={styles.actionLabel}>{t("commandCenter.viewAlerts")}</Text>
        </TouchableOpacity>
      </View>

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
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  statCard: {
    flex: 1, alignItems: "center", padding: spacing.lg,
    backgroundColor: colors.elevated, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  statValue: { ...typography.display, fontSize: 28 },
  statLabel: { ...typography.caption, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" },
  sectionTitle: { ...typography.label, fontSize: 12, marginBottom: spacing.md, marginTop: spacing.sm },
  eventCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, marginBottom: spacing.xs },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.md },
  eventContent: { flex: 1 },
  eventSummary: { ...typography.body, fontSize: 14 },
  eventTime: { ...typography.small, marginTop: 2 },
  emptySection: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },
  actionRow: { flexDirection: "row", gap: spacing.md },
  actionCard: { flex: 1, alignItems: "center", padding: spacing.lg, backgroundColor: colors.elevated, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  actionLabel: { ...typography.caption, fontWeight: "600", textAlign: "center" },
});
