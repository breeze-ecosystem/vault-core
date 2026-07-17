import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchComplianceReports, type ComplianceReport } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { ShieldCheck, RefreshCw } from "lucide-react-native";

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  compliant: "#22c55e",
  non_compliant: "#ef4444",
  pending: "#f59e0b",
};

const STATUS_BG: Record<string, string> = {
  compliant: "rgba(34,197,94,0.15)",
  non_compliant: "rgba(239,68,68,0.15)",
  pending: "rgba(245,158,11,0.15)",
};

export default function ConformiteScreen() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadReports = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchComplianceReports({ limit: PAGE_SIZE, page: pageNum });
      if (append) setReports(prev => [...prev, ...result.data]);
      else setReports(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(t("compliance.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const refresh = async () => {
    setRefreshing(true);
    await loadReports(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || reports.length >= total) return;
    loadReports(page + 1, true);
  };

  const showSummary = (report: ComplianceReport) => {
    const metricsText = report.metrics
      ? Object.entries(report.metrics).map(([k, v]) => `• ${k}: ${v}`).join("\n")
      : "—";
    Alert.alert(
      report.title,
      `${t("compliance.status")}: ${t(`compliance.${report.status === "non_compliant" ? "nonCompliant" : report.status}`)}\n${t("compliance.date")}: ${new Date(report.generatedAt).toLocaleDateString("fr-FR")}\n${t("compliance.metrics")}:\n${metricsText}`,
    );
  };

  if (loading && reports.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (error && reports.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.destructive, marginBottom: spacing.md }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadReports()}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={reports}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => showSummary(item)}>
            <View style={styles.cardTop}>
              <Text style={styles.reportTitle}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[item.status] || STATUS_BG.pending }]}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || STATUS_COLORS.pending }]} />
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || STATUS_COLORS.pending }]}>
                  {t(`compliance.${item.status === "non_compliant" ? "nonCompliant" : item.status}`)}
                </Text>
              </View>
            </View>
            <Text style={styles.dateText}>{t("compliance.date")}: {new Date(item.generatedAt).toLocaleDateString("fr-FR")}</Text>
            {item.metrics && (
              <Text style={styles.metricsText}>{t("compliance.metrics")}: {Object.keys(item.metrics).length}</Text>
            )}
          </TouchableOpacity>
        )}
        estimatedItemSize={90}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <ShieldCheck size={20} color={colors.primary} />
            <Text style={styles.title}>{t("compliance.title")}</Text>
            <Text style={styles.count}>{total > 0 ? `${reports.length}/${total}` : ""}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <ShieldCheck size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("compliance.empty")}</Text>
          </View>
        ) : null}
        ListFooterComponent={
          reports.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("common.loading")}</Text>}
            </TouchableOpacity>
          ) : <View style={{ height: 24 }} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  scroll: { padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  title: { ...typography.h2, flex: 1 },
  count: { ...typography.caption, fontWeight: "600" },
  card: {
    backgroundColor: colors.elevated, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.borderLight,
    padding: spacing.md,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  reportTitle: { ...typography.body, fontWeight: "600", flex: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  dateText: { ...typography.caption, fontSize: 12, marginTop: 2 },
  metricsText: { ...typography.small, marginTop: 2 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  retryText: { color: "#fff", ...typography.label, fontSize: 14 },
  loadMoreBtn: {
    padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: "center", marginTop: spacing.sm,
  },
  loadMoreText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
