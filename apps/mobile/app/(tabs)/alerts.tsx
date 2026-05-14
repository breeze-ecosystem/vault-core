import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { fetchAlerts, type AlertItem, type AlertSeverity, type AlertStatus } from "@/lib/api";
import { AlertCard } from "@/components/alert-card";
import { severityColors, alertStatusColors, alertStatusLabels } from "@/lib/constants";

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
      style={[styles.chip, active && { backgroundColor: color ?? "#2563eb", borderColor: color ?? "#2563eb" }]}
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
        limit: PAGE_SIZE,
        page: pageNum,
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

  const handleFilterSeverity = (sev: AlertSeverity | "") => {
    setFilterSeverity(prev => prev === sev ? "" : sev);
  };
  const handleFilterStatus = (st: AlertStatus | "") => {
    setFilterStatus(prev => prev === st ? "" : st);
  };

  if (loading && alerts.length === 0) {
    return <View style={styles.centered}><ActivityIndicator color="#2563eb" size="large" /><Text style={styles.loadingText}>Chargement des alertes...</Text></View>;
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAlerts} tintColor="#2563eb" />}>
      <View style={styles.header}>
        <Text style={styles.title}>Alertes</Text>
        <Text style={styles.subtitle}>{alerts.length}{total > alerts.length ? ` / ${total}` : ""} alerte{alerts.length !== 1 ? "s" : ""}</Text>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {SEVERITIES.map(s => (
            <FilterChip
              key={s.value} label={s.label}
              active={filterSeverity === s.value}
              color={s.value ? severityColors[s.value] : undefined}
              onPress={() => handleFilterSeverity(s.value as AlertSeverity | "")}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {STATUSES.map(s => (
            <FilterChip
              key={s.value} label={s.label}
              active={filterStatus === s.value}
              color={s.value ? alertStatusColors[s.value] : undefined}
              onPress={() => handleFilterStatus(s.value as AlertStatus | "")}
            />
          ))}
        </ScrollView>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      {alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
      {!loading && !error && alerts.length === 0 && (
        <View style={styles.empty}><Text style={styles.emptyText}>Aucune alerte</Text><Text style={styles.emptyHint}>Les alertes apparaitront ici quand elles seront detectees</Text></View>
      )}
      {alerts.length < total && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
          {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>Charger plus ({total - alerts.length} restantes)</Text>}
        </TouchableOpacity>
      )}
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  loadingText: { color: "#888", marginTop: 12, fontSize: 14 },
  header: { padding: 20, paddingBottom: 6 },
  title: { fontSize: 22, fontWeight: "bold", color: "#ededed" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 2 },
  filters: { paddingHorizontal: 20, paddingBottom: 10, gap: 6 },
  filterRow: { marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#444", marginRight: 8, backgroundColor: "#111" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#aaa" },
  errorBox: { marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 14 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
  emptyHint: { color: "#666", fontSize: 12, marginTop: 4 },
  loadMoreBtn: { margin: 20, padding: 12, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  loadMoreText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  spacer: { height: 40 },
});
