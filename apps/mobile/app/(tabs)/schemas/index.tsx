import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchSchemas, type SchemaDefinition } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { ScrollText, RefreshCw } from "lucide-react-native";

const PAGE_SIZE = 20;

export default function SchemasScreen() {
  const { t } = useTranslation();
  const [schemas, setSchemas] = useState<SchemaDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadSchemas = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchSchemas({ limit: PAGE_SIZE, page: pageNum });
      if (append) setSchemas(prev => [...prev, ...result.data]);
      else setSchemas(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(t("schemas.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => { loadSchemas(); }, [loadSchemas]);

  const refresh = async () => {
    setRefreshing(true);
    await loadSchemas(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || schemas.length >= total) return;
    loadSchemas(page + 1, true);
  };

  if (loading && schemas.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (error && schemas.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.destructive, marginBottom: spacing.md }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadSchemas()}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={schemas}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <ScrollText size={20} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.schemaName}>{item.name}</Text>
                <View style={[styles.versionBadge]}>
                  <Text style={styles.versionText}>v{item.version}</Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.dot, item.isActive ? styles.dotActive : styles.dotInactive]} />
                <Text style={styles.statusLabel}>{item.isActive ? t("schemas.active") : t("schemas.inactive")}</Text>
              </View>
            </View>
          </View>
        )}
        estimatedItemSize={80}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <ScrollText size={20} color={colors.primary} />
            <Text style={styles.title}>{t("schemas.title")}</Text>
            <Text style={styles.count}>{total > 0 ? `${schemas.length}/${total}` : ""}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <ScrollText size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("schemas.empty")}</Text>
          </View>
        ) : null}
        ListFooterComponent={
          schemas.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("common.loadMore", { remaining: total - schemas.length })}</Text>}
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
    padding: spacing.md, gap: spacing.md,
  },
  cardLeft: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  schemaName: { ...typography.body, fontWeight: "600", flex: 1 },
  versionBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: colors.surface },
  versionText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, fontFamily: "monospace" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: colors.success },
  dotInactive: { backgroundColor: colors.textMuted },
  statusLabel: { ...typography.small },
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
