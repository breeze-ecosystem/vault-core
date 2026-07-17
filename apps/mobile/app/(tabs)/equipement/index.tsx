import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchEquipment, type EquipmentItem } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react-native";

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  ONLINE: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", icon: <Wifi size={14} color="#22c55e" /> },
  OFFLINE: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", icon: <WifiOff size={14} color="#ef4444" /> },
  DEGRADED: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: <AlertTriangle size={14} color="#f59e0b" /> },
};

function getStatusConfig(status: string | undefined) {
  return STATUS_CONFIG[status || ""] || STATUS_CONFIG.OFFLINE;
}

function formatHeartbeat(hb: string | null, t: (key: string) => string): string {
  if (!hb) return "—";
  try {
    const d = new Date(hb);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return t("equipement.momentsAgo");
    if (diff < 3600000) return t("equipement.minutesAgo", { minutes: Math.floor(diff / 60000) });
    if (diff < 86400000) return t("equipement.hoursAgo", { hours: Math.floor(diff / 3600000) });
    return d.toLocaleDateString("fr-FR");
  } catch {
    return hb;
  }
}

export default function EquipementScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadEquipment = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchEquipment({ limit: PAGE_SIZE, page: pageNum });
      if (append) setItems(prev => [...prev, ...result.data]);
      else setItems(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(t("equipement.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => { loadEquipment(); }, [loadEquipment]);

  const refresh = async () => {
    setRefreshing(true);
    await loadEquipment(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || items.length >= total) return;
    loadEquipment(page + 1, true);
  };

  if (loading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.destructive, marginBottom: spacing.md }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadEquipment()}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={items}
        renderItem={({ item }) => {
          const cfg = getStatusConfig(item.status);
          return (
            <View style={styles.card}>
              <View style={[styles.statusIndicator, { backgroundColor: cfg.bg }]}>
                <View style={[styles.dot, { backgroundColor: cfg.color }]} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemType}>{item.type} — {item.siteName || "—"}</Text>
                <Text style={styles.heartbeat}>{t("equipement.lastHeartbeat")}: {formatHeartbeat(item.lastHeartbeat, t)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.statusLabel, { color: cfg.color }]}>
                  {item.status === "ONLINE" ? t("equipement.online") : item.status === "OFFLINE" ? t("equipement.offline") : t("equipement.degraded")}
                </Text>
              </View>
            </View>
          );
        }}
        estimatedItemSize={90}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Wifi size={20} color={colors.primary} />
            <Text style={styles.title}>{t("equipement.title")}</Text>
            <Text style={styles.count}>{total > 0 ? `${items.length}/${total}` : ""}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <WifiOff size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("equipement.empty")}</Text>
          </View>
        ) : null}
        ListFooterComponent={
          items.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("common.loadMore", { remaining: total - items.length })}</Text>}
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
    padding: spacing.md, gap: spacing.sm,
  },
  statusIndicator: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { flex: 1 },
  itemName: { ...typography.body, fontWeight: "600" },
  itemType: { ...typography.caption, fontSize: 12, marginTop: 2 },
  heartbeat: { ...typography.small, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusLabel: { fontSize: 11, fontWeight: "600" },
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
