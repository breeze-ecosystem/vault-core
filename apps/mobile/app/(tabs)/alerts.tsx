import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchAlerts, type AlertItem, type AlertSeverity, type AlertStatus } from "@/lib/api";
import { AlertCard } from "@/components/alert-card";
import { severityColors, alertStatusColors } from "@/lib/constants";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { Bell, Filter } from "lucide-react-native";

const PAGE_SIZE = 20;

const SEVERITIES: { label: string; value: AlertSeverity | "" }[] = [
  { label: "Toutes", value: "" },
  { label: "CRITICAL", value: "CRITICAL" },
  { label: "HIGH", value: "HIGH" },
  { label: "MEDIUM", value: "MEDIUM" },
  { label: "LOW", value: "LOW" },
  { label: "INFO", value: "INFO" },
];

const STATUSES: { label: string; value: AlertStatus | "" }[] = [
  { label: "Tous", value: "" },
  { label: "Ouverte", value: "OPEN" },
  { label: "Prise en compte", value: "ACKNOWLEDGED" },
  { label: "Résolue", value: "RESOLVED" },
  { label: "Faux positif", value: "FALSE_POSITIVE" },
];

function FilterChip({ label, active, color, onPress }: { label: string; active: boolean; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: color ?? colors.primary, borderColor: color ?? colors.primary }]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && { color: "#fff" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "">("");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "">("");

  const loadAlerts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchAlerts({
        limit: PAGE_SIZE, page: pageNum,
        severity: filterSeverity || undefined,
        status: filterStatus || undefined,
      });
      if (append) setAlerts(prev => [...prev, ...result.data]);
      else setAlerts(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterSeverity, filterStatus]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const refreshAlerts = async () => {
    setRefreshing(true);
    await loadAlerts(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || alerts.length >= total) return;
    loadAlerts(page + 1, true);
  };

  const handleFilterSeverity = (sev: AlertSeverity | "") => setFilterSeverity(prev => prev === sev ? "" : sev);
  const handleFilterStatus = (st: AlertStatus | "") => setFilterStatus(prev => prev === st ? "" : st);

  if (loading && alerts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Chargement des alertes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={alerts}
        renderItem={({ item }) => <AlertCard alert={item} />}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refreshAlerts}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.header}>
              <Bell size={20} color={colors.warning} />
              <Text style={styles.title}>Alertes</Text>
              <Text style={styles.count}>{alerts.length}{total > alerts.length ? ` / ${total}` : ""}</Text>
            </View>

            <View style={styles.filters}>
              <Filter size={14} color={colors.textMuted} />
              <View style={{ flexDirection: "row" }}>
                {SEVERITIES.map(s => (
                  <FilterChip
                    key={s.value} label={s.label}
                    active={filterSeverity === s.value}
                    color={s.value ? severityColors[s.value] : undefined}
                    onPress={() => handleFilterSeverity(s.value as AlertSeverity | "")}
                  />
                ))}
              </View>
            </View>
            <View style={[styles.filterRow, { flexDirection: "row", flexWrap: "wrap" }]}>
              {STATUSES.map(s => (
                <FilterChip
                  key={s.value} label={s.label}
                  active={filterStatus === s.value}
                  color={s.value ? alertStatusColors[s.value] : undefined}
                  onPress={() => handleFilterStatus(s.value as AlertStatus | "")}
                />
              ))}
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Bell size={40} color={colors.border} />
            <Text style={styles.emptyTitle}>Aucune alerte</Text>
            <Text style={styles.emptyHint}>Les alertes apparaîtront ici quand elles seront détectées</Text>
          </View>
        ) : null}
        ListFooterComponent={
          alerts.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>Charger plus ({total - alerts.length} restantes)</Text>}
            </TouchableOpacity>
          ) : (
            <View style={{ height: 24 }} />
          )
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
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...typography.h2, flex: 1 },
  count: { ...typography.caption, fontWeight: "600" },
  filters: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  filterRow: { marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: colors.borderLight, marginRight: 8,
    backgroundColor: colors.elevated,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  errorBox: {
    padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: colors.destructive,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.destructive, fontSize: 13 },
  empty: { padding: 40, alignItems: "center" },
  emptyTitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  emptyHint: { ...typography.small, marginTop: spacing.xs, textAlign: "center" },
  loadMoreBtn: {
    padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: "center", marginTop: spacing.sm,
  },
  loadMoreText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
