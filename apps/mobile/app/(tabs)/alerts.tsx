import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { fetchAlerts, type AlertItem } from "@/lib/api";
import { AlertCard } from "@/components/alert-card";

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAlerts() {
    try {
      setLoading(true);
      const result = await fetchAlerts(50);
      setAlerts(result.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAlerts} tintColor="#2563eb" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Alertes</Text>
        <Text style={styles.subtitle}>{alerts.length} alertes</Text>
      </View>

      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}

      {!loading && alerts.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune alerte</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", color: "#ededed" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 2 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
});
