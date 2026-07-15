import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { useAuth } from "@/lib/auth-context";
import { fetchDashboardStats, type DashboardStats } from "@/lib/api";
import { colors, typography } from "@repo/design";
import { QuickActionButton } from "@/components/quick-action-button";
import {
  Shield,
  Camera,
  Bell,
  DoorOpen,
  Search,
  AlertTriangle,
  Clock,
} from "lucide-react-native";

export default function HomeScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInTime, setCheckInTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const startCheckIn = useCallback(() => {
    const now = Date.now();
    setCheckInTime(now);
  }, []);

  const endCheckIn = useCallback(() => {
    setCheckInTime(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsed("00:00:00");
  }, []);

  useEffect(() => {
    loadStats();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (checkInTime) {
      timerRef.current = setInterval(() => {
        const diff = Math.floor((Date.now() - checkInTime) / 1000);
        const h = String(Math.floor(diff / 3600)).padStart(2, "0");
        const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
        const s = String(diff % 60).padStart(2, "0");
        setElapsed(`${h}:${m}:${s}`);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkInTime]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.greeting}>
            Bonjour, {user?.firstName ?? "Utilisateur"}
          </Text>
          <Text style={styles.role}>{user?.role ?? "Agent de sécurité"}</Text>
        </View>
        <View style={styles.logoWrap}>
          <Shield size={20} color={colors.shared.primary} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshStats} tintColor={colors.shared.primary} />
        }
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.checkInCard}>
          {checkInTime ? (
            <View style={styles.checkInActive}>
              <View style={styles.checkInHeader}>
                <Clock size={18} color={colors.shared.primary} />
                <Text style={styles.checkInLabel}>Pointage en cours</Text>
              </View>
              <Text style={styles.checkInTimer}>{elapsed}</Text>
              <Pressable style={styles.checkOutButton} onPress={endCheckIn}>
                <Text style={styles.checkOutButtonText}>Terminer le service</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.checkInButton} onPress={startCheckIn}>
              <Clock size={20} color="#fff" />
              <Text style={styles.checkInButtonText}>Pointer</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.quickActionsPrimary}>
          <QuickActionButton
            icon={<Camera size={24} color={colors.shared.primary} />}
            label="Signaler incident"
            onPress={() => Alert.alert("Signaler un incident", "Fonctionnalité à venir")}
          />
          <QuickActionButton
            icon={<Bell size={24} color={colors.shared.primary} />}
            label="Voir alertes"
            onPress={() => Alert.alert("Alertes", "Fonctionnalité à venir")}
          />
          <QuickActionButton
            icon={<DoorOpen size={24} color={colors.shared.primary} />}
            label="Contrôle porte"
            onPress={() => Alert.alert("Contrôle d'accès", "Fonctionnalité à venir")}
          />
        </View>
        <View style={styles.quickActionsSecondary}>
          <QuickActionButton
            icon={<Search size={24} color={colors.shared.primary} />}
            label="Trouver caméra"
            onPress={() => Alert.alert("Recherche", "Fonctionnalité à venir")}
          />
          <QuickActionButton
            icon={<AlertTriangle size={24} color={colors.shared.warning} />}
            label="Alertes critiques"
            onPress={() => Alert.alert("Alertes critiques", "Fonctionnalité à venir")}
          />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingGrid}>
            {[1, 2].map((i) => (
              <View key={i} style={styles.skeleton} />
            ))}
          </View>
        ) : stats ? (
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>Aperçu du site</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {stats.cameras.online}/{stats.cameras.total}
                </Text>
                <Text style={styles.statLabel}>Caméras en ligne</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.alerts.open}</Text>
                <Text style={styles.statLabel}>Alertes actives</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.dark.text,
  },
  role: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(6,182,212,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.2)",
  },
  scroll: { padding: 20, paddingTop: 16 },
  errorBox: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: colors.shared.destructive,
    marginBottom: 16,
  },
  errorText: { color: colors.shared.destructive, fontSize: 13 },
  checkInCard: {
    marginBottom: 20,
  },
  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.shared.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  checkInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  checkInActive: {
    backgroundColor: colors.dark.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 20,
    alignItems: "center",
  },
  checkInHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  checkInLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.shared.primary,
  },
  checkInTimer: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.dark.text,
    fontVariant: ["tabular-nums"],
    marginBottom: 12,
  },
  checkOutButton: {
    backgroundColor: colors.dark.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  checkOutButtonText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  quickActionsPrimary: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  quickActionsSecondary: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 24,
  },
  loadingGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  skeleton: {
    flex: 1,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.dark.elevated,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  statsCard: {
    backgroundColor: colors.dark.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 16,
    marginBottom: 16,
  },
  statsCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.dark.text,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 11,
    color: colors.dark.textSecondary,
    marginTop: 4,
  },
});
