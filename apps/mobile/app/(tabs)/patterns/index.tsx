import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchPatterns, type SecurityPattern } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Repeat, RefreshCw } from "lucide-react-native";

const PAGE_SIZE = 20;

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#3b82f6",
  LOW: "#6b7280",
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: "rgba(239,68,68,0.15)",
  HIGH: "rgba(245,158,11,0.15)",
  MEDIUM: "rgba(59,130,246,0.15)",
  LOW: "rgba(107,114,128,0.15)",
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function PatternsScreen() {
  const { t } = useTranslation();
  const [patterns, setPatterns] = useState<SecurityPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPatterns = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchPatterns({ limit: PAGE_SIZE, page: pageNum });
      if (append) setPatterns(prev => [...prev, ...result.data]);
      else setPatterns(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(t("patterns.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => { loadPatterns(); }, [loadPatterns]);

  const refresh = async () => {
    setRefreshing(true);
    await loadPatterns(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || patterns.length >= total) return;
    loadPatterns(page + 1, true);
  };

  if (loading && patterns.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (error && patterns.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.destructive, marginBottom: spacing.md }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadPatterns()}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={patterns}
        renderItem={({ item }) => {
          const sevColor = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.MEDIUM;
          const sevBg = SEVERITY_BG[item.severity] || SEVERITY_BG.MEDIUM;
          return (
            <View style={[styles.card, { borderLeftColor: sevColor, borderLeftWidth: 4 }]}>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.patternName}>{item.name}</Text>
                  <View style={[styles.sevBadge, { backgroundColor: sevBg }]}>
                    <Text style={[styles.sevText, { color: sevColor }]}>{item.severity}</Text>
                  </View>
                </View>
                <Text style={styles.patternType}>{item.type}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: item.status === "active" ? colors.destructive : colors.success }]} />
                  <Text style={styles.statusText}>{item.status === "active" ? t("patterns.active") : t("patterns.resolved")}</Text>
                </View>
                <Text style={styles.dateText}>{t("patterns.detectedAt")}: {formatDate(item.detectedAt)}</Text>
              </View>
            </View>
          );
        }}
        estimatedItemSize={100}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Repeat size={20} color={colors.primary} />
            <Text style={styles.title}>{t("patterns.title")}</Text>
            <Text style={styles.count}>{total > 0 ? `${patterns.length}/${total}` : ""}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Repeat size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("patterns.empty")}</Text>
          </View>
        ) : null}
        ListFooterComponent={
          patterns.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("common.loadMore", { remaining: total - patterns.length })}</Text>}
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
  cardBody: {},
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  patternName: { ...typography.body, fontWeight: "600", flex: 1 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sevText: { fontSize: 11, fontWeight: "600" },
  patternType: { ...typography.caption, fontSize: 12, marginBottom: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...typography.small },
  dateText: { ...typography.small, marginTop: 2 },
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
