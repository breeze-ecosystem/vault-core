import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchAuditLogs, type AuditLogEntry } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Shield, ChevronRight, Search, RefreshCw } from "lucide-react-native";

const PAGE_SIZE = 20;

const ACTION_COLORS: Record<string, string> = {
  CREATE: "#22c55e",
  UPDATE: "#3b82f6",
  DELETE: "#ef4444",
  CREATE_FAILED: "#f97316",
  UPDATE_FAILED: "#f97316",
  DELETE_FAILED: "#f97316",
};

function getActionLabel(action: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    CREATE: t("audit.actionCreate"),
    UPDATE: t("audit.actionUpdate"),
    DELETE: t("audit.actionDelete"),
    CREATE_FAILED: t("audit.actionCreateFailed"),
    UPDATE_FAILED: t("audit.actionUpdateFailed"),
    DELETE_FAILED: t("audit.actionDeleteFailed"),
  };
  return map[action] || action;
}

function formatDate(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function AuditScreen() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadEntries = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchAuditLogs({ limit: PAGE_SIZE, page: pageNum });
      if (append) setEntries(prev => [...prev, ...result.data]);
      else setEntries(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(t("audit.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const refresh = async () => {
    setRefreshing(true);
    await loadEntries(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || entries.length >= total) return;
    loadEntries(page + 1, true);
  };

  const showDetail = (entry: AuditLogEntry) => {
    Alert.alert(
      t("audit.detail"),
      `${t("audit.action")}: ${getActionLabel(entry.action, t)}\n${t("audit.entity")}: ${entry.entityType}\n${t("audit.user")}: ${entry.userName || entry.userId || "—"}\n${t("audit.ipAddress")}: ${entry.ipAddress || "—"}\n${t("audit.timestamp")}: ${formatDate(entry.timestamp)}`,
    );
  };

  if (loading && entries.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (error && entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.destructive, marginBottom: spacing.md }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadEntries()}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={entries}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => showDetail(item)}>
            <View style={[styles.actionIndicator, { backgroundColor: ACTION_COLORS[item.action] || colors.textMuted }]} />
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.actionLabel}>{getActionLabel(item.action, t)}</Text>
                <Text style={styles.entityLabel}>{item.entityType}</Text>
              </View>
              <Text style={styles.userText}>{item.userName || item.userId || "—"}</Text>
              <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        estimatedItemSize={80}
        keyExtractor={(item) => item.id || `${item.timestamp}-${Math.random()}`}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Shield size={20} color={colors.primary} />
            <Text style={styles.title}>{t("audit.title")}</Text>
            <Text style={styles.count}>{total > 0 ? `${entries.length}/${total}` : ""}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Shield size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("audit.empty")}</Text>
          </View>
        ) : null}
        ListFooterComponent={
          entries.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("common.loadMore", { remaining: total - entries.length })}</Text>}
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
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.elevated, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.borderLight,
    overflow: "hidden",
  },
  actionIndicator: { width: 4, alignSelf: "stretch" },
  cardContent: { flex: 1, padding: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  actionLabel: { ...typography.label, fontSize: 13, fontWeight: "700" },
  entityLabel: { ...typography.caption, fontSize: 11, backgroundColor: colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  userText: { ...typography.caption, fontSize: 12 },
  timestamp: { ...typography.small, marginTop: 2 },
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
