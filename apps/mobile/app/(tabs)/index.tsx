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
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { Shield, Activity } from "lucide-react-native";

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

  useEffect(() => { loadStats(); }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.greeting}>
            Bonjour, {user?.firstName ?? "Utilisateur"}
          </Text>
          <Text style={styles.role}>{user?.role ?? ""}</Text>
        </View>
        <View style={styles.logoWrap}>
          <Shield size={20} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshStats} tintColor={colors.primary} />
        }
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && !refreshing ? (
          <View style={styles.loadingGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeleton} />
            ))}
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatsCard
                title="Caméras"
                value={stats ? `${stats.cameras.online}/${stats.cameras.total}` : "—"}
                subtitle="en ligne"
                color={colors.success}
              />
              <StatsCard
                title="Alertes"
                value={stats ? String(stats.alerts.open) : "—"}
                subtitle="actives"
                color={colors.warning}
              />
              <StatsCard
                title="Sites"
                value={stats ? String(stats.sites.active) : "—"}
                subtitle="actifs"
                color={colors.primary}
              />
              <StatsCard
                title="Utilisateurs"
                value={stats ? String(stats.users.total) : "—"}
                subtitle="total"
                color={colors.info}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Activity size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Alertes récentes</Text>
              </View>
              {stats?.recentAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
              {stats && stats.recentAlerts.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Aucune alerte récente</Text>
                </View>
              )}
            </View>
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: { ...typography.h2, fontSize: 20 },
  role: { ...typography.caption, marginTop: 2, textTransform: "capitalize" },
  logoWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(6,182,212,0.1)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(6,182,212,0.2)",
  },
  scroll: { padding: spacing.lg, paddingTop: spacing.md },
  errorBox: {
    padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1, borderColor: colors.destructive,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.destructive, fontSize: 13 },
  loadingGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.xl,
  },
  skeleton: {
    width: "48%", height: 100, borderRadius: borderRadius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.xl,
  },
  section: { marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.label, fontSize: 12, color: colors.textSecondary },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.caption },
});
