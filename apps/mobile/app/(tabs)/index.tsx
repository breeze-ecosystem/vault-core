import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/lib/auth-context";
import { fetchDashboardStats, type DashboardStats } from "@/lib/api";
import { StatsCard } from "@/components/stats-card";
import { AlertCard } from "@/components/alert-card";

export default function HomeScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  async function refreshStats() {
    try {
      setRefreshing(true);
      setError(null);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshStats} tintColor="#2563eb" />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Bonjour, {user?.firstName ?? "Utilisateur"}
        </Text>
        <Text style={styles.role}>{user?.role ?? ""}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        <StatsCard
          title="Cameras"
          value={stats ? `${stats.cameras.online}/${stats.cameras.total}` : "—"}
          subtitle="en ligne"
          color="#22c55e"
        />
        <StatsCard
          title="Alertes"
          value={stats ? String(stats.alerts.open) : "—"}
          subtitle="actives"
          color="#f97316"
        />
        <StatsCard
          title="Sites"
          value={stats ? String(stats.sites.active) : "—"}
          subtitle="actifs"
          color="#3b82f6"
        />
        <StatsCard
          title="Utilisateurs"
          value={stats ? String(stats.users.total) : "—"}
          subtitle="total"
          color="#a855f7"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alertes recentes</Text>
        {stats?.recentAlerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
        {stats && stats.recentAlerts.length === 0 && (
          <Text style={styles.emptyText}>Aucune alerte recente</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: { padding: 20, paddingBottom: 10 },
  greeting: { fontSize: 22, fontWeight: "bold", color: "#ededed" },
  role: { fontSize: 13, color: "#888", marginTop: 2 },
  errorBox: {
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  errorText: { color: "#ef4444", fontSize: 14 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 10,
  },
  section: { padding: 20, paddingTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#ededed", marginBottom: 12 },
  emptyText: { color: "#888", fontSize: 14, textAlign: "center", paddingVertical: 20 },
});
