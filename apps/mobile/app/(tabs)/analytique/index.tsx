import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { fetchAnalytics, fetchDashboardStats, type AnalyticsData, type DashboardStats } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { StatsCard } from "@/components/stats-card";
import { BarChart3, TrendingUp, Activity, AlertTriangle } from "lucide-react-native";

export default function AnalytiqueScreen() {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [analyticsData, statsData] = await Promise.all([
        fetchAnalytics().catch(() => null),
        fetchDashboardStats().catch(() => null),
      ]);
      setAnalytics(analyticsData);
      setStats(statsData);
    } catch (e) {
      setError(t("analytique.loadingError"));
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

  const eventTotal = analytics?.totalEvents ?? stats?.alerts.total ?? 0;
  const activeAlerts = analytics?.activeAlerts ?? stats?.alerts.open ?? 0;
  const camUptime = analytics?.cameraUptime ?? (
    stats ? Math.round((stats.cameras.online / Math.max(stats.cameras.total, 1)) * 100) : 0
  );

  const breakdown = analytics?.eventBreakdown ?? [
    { type: "Alertes", count: stats?.alerts.critical ?? 0, color: "#ef4444" },
    { type: "Haute", count: stats?.alerts.high ?? 0, color: "#f97316" },
    { type: "Moyenne", count: stats?.alerts.medium ?? 0, color: "#eab308" },
    { type: "Basse", count: stats?.alerts.low ?? 0, color: "#3b82f6" },
  ].filter(b => b.count > 0);

  const maxCount = Math.max(...breakdown.map(b => b.count), 1);

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
        <TrendingUp size={20} color={colors.primary} />
        <Text style={styles.title}>{t("analytique.title")}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <StatsCard
          title={t("analytique.totalEvents")}
          value={String(eventTotal)}
          subtitle={t("analytique.totalEvents")}
          color={colors.primary}
        />
        <StatsCard
          title={t("analytique.activeAlerts")}
          value={String(activeAlerts)}
          subtitle={t("analytique.activeAlerts")}
          color={colors.warning}
        />
      </View>
      <View style={styles.statsRow}>
        <StatsCard
          title={t("analytique.cameraUptime")}
          value={`${camUptime}%`}
          subtitle={t("analytique.cameraUptime")}
          color={colors.success}
        />
        <View style={[styles.emptyCard, { width: "48%" }]} />
      </View>

      {breakdown.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={16} color={colors.textMuted} />
            <Text style={styles.sectionTitle}>{t("analytique.eventBreakdown")}</Text>
          </View>
          <View style={styles.breakdownCard}>
            {breakdown.map((item, idx) => (
              <View key={idx} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                  <Text style={styles.breakdownLabel}>{item.type}</Text>
                </View>
                <View style={styles.breakdownBarWrap}>
                  <View style={[styles.breakdownBar, { width: `${Math.max((item.count / maxCount) * 100, 5)}%`, backgroundColor: item.color }]} />
                </View>
                <Text style={styles.breakdownValue}>{item.count}</Text>
              </View>
            ))}
          </View>
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
  errorBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md, marginBottom: spacing.md },
  errorText: { ...typography.caption, color: colors.destructive, flex: 1 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  emptyCard: { height: 0 },
  section: { marginTop: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { ...typography.label, fontSize: 12, flex: 1 },
  breakdownCard: {
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  breakdownRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  breakdownLeft: { flexDirection: "row", alignItems: "center", width: 80, gap: spacing.xs },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { ...typography.caption, fontSize: 12 },
  breakdownBarWrap: { flex: 1, height: 20, backgroundColor: colors.surface, borderRadius: 4, marginHorizontal: spacing.sm, overflow: "hidden" },
  breakdownBar: { height: "100%", borderRadius: 4, minWidth: 8 },
  breakdownValue: { ...typography.body, fontWeight: "600", width: 40, textAlign: "right" },
});
