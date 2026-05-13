import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { fetchAlerts, type AlertItem } from "@/lib/api";
import { AlertCard } from "@/components/alert-card";

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAlerts() {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchAlerts(50);
      setAlerts(result.data);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAlerts() {
    try {
      setRefreshing(true);
      setError(null);
      const result = await fetchAlerts(50);
      setAlerts(result.data);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  if (loading && alerts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Chargement des alertes...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAlerts} tintColor="#2563eb" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Alertes</Text>
        <Text style={styles.subtitle}>{alerts.length} alerte{alerts.length !== 1 ? "s" : ""}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}

      {!loading && !error && alerts.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune alerte</Text>
          <Text style={styles.emptyHint}>
            Les alertes apparaitront ici quand elles seront detectees
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  loadingText: {
    color: "#888",
    marginTop: 12,
    fontSize: 14,
  },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", color: "#ededed" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 2 },
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  errorText: { color: "#ef4444", fontSize: 14 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
  emptyHint: { color: "#666", fontSize: 12, marginTop: 4 },
});
