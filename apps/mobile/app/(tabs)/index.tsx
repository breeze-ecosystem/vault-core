import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Alert,
  AppState,
} from "react-native";
import { useAuth } from "@/lib/auth-context";
import { fetchDashboardStats, type DashboardStats } from "@/lib/api";
import { colors, typography } from "@repo/design";
import { useTranslation } from "@/lib/i18n";
import { QuickActionButton } from "@/components/quick-action-button";
import { ArmDisarmToggle } from "@/components/arm-disarm-toggle";
import * as SecureStore from "expo-secure-store";
import { getNetworkStateAsync, NetworkStateType } from "expo-network";
import { postHeartbeat, postDisconnected } from "@/lib/api-extensions";
import {
  Shield,
  Camera,
  Bell,
  DoorOpen,
  Search,
  AlertTriangle,
  Clock,
  Wifi,
} from "lucide-react-native";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInTime, setCheckInTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [armed, setArmed] = useState(false);
  const [wifiConnected, setWifiConnected] = useState(false);
  const [currentSsid, setCurrentSsid] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const wifiCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("home.loadingError"));
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
      setError(e instanceof Error ? e.message : t("home.loadingError"));
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

  // WiFi SSID monitoring for geofencing
  const checkWifiState = useCallback(async () => {
    try {
      const state = await getNetworkStateAsync();
      const isWifi = state.type === NetworkStateType.WIFI;
      const prevWifi = wifiConnected;

      setWifiConnected(isWifi);

      if (isWifi && !prevWifi) {
        // Reconnected to WiFi — send heartbeat
        const trustedSsidsRaw = await SecureStore.getItemAsync("trustedSsids");
        const trustedSsids: string[] = trustedSsidsRaw ? JSON.parse(trustedSsidsRaw) : [];
        const currentIp = state.isConnected ? "wifi" : "unknown";
        setCurrentSsid(currentIp);
        if (trustedSsids.length > 0) {
          postHeartbeat(currentIp).catch(() => {});
        }
        if (armed) {
          setArmed(false);
        }
      } else if (!isWifi && prevWifi) {
        // Disconnected from WiFi
        setCurrentSsid(null);
        postDisconnected().catch(() => {});
      }
    } catch {
      // expo-network may not be available in all environments
    }
  }, [wifiConnected, armed]);

  useEffect(() => {
    checkWifiState();

    // Check WiFi state periodically (every 60s)
    wifiCheckIntervalRef.current = setInterval(checkWifiState, 60000);

    // Listen for app state changes
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        // App came to foreground — check WiFi immediately
        checkWifiState();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      if (wifiCheckIntervalRef.current) clearInterval(wifiCheckIntervalRef.current);
      subscription.remove();
    };
  }, [checkWifiState]);

  const handleArmToggle = useCallback(() => {
    setArmed((prev) => !prev);
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
            {t("home.greeting")}, {user?.firstName ?? t("home.user")}
          </Text>
          <Text style={styles.role}>{user?.role ?? t("home.securityAgent")}</Text>
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
                <Text style={styles.checkInLabel}>{t("home.checkInActive")}</Text>
              </View>
              <Text style={styles.checkInTimer}>{elapsed}</Text>
              <Pressable style={styles.checkOutButton} onPress={endCheckIn}>
                <Text style={styles.checkOutButtonText}>{t("home.endService")}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.checkInButton} onPress={startCheckIn}>
              <Clock size={20} color="#fff" />
              <Text style={styles.checkInButtonText}>{t("home.checkIn")}</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t("home.quickActions")}</Text>
        <View style={styles.quickActionsPrimary}>
          <QuickActionButton
            icon={<Camera size={24} color={colors.shared.primary} />}
            label={t("home.reportIncident")}
            onPress={() => Alert.alert(t("home.reportIncident"), t("home.featureComing"))}
          />
          <QuickActionButton
            icon={<Bell size={24} color={colors.shared.primary} />}
            label={t("home.viewAlerts")}
            onPress={() => Alert.alert(t("home.viewAlerts"), t("home.featureComing"))}
          />
          <QuickActionButton
            icon={<DoorOpen size={24} color={colors.shared.primary} />}
            label={t("home.doorControl")}
            onPress={() => Alert.alert(t("home.doorControl"), t("home.featureComing"))}
          />
        </View>
        <View style={styles.quickActionsSecondary}>
          <QuickActionButton
            icon={<Search size={24} color={colors.shared.primary} />}
            label={t("home.findCamera")}
            onPress={() => Alert.alert(t("home.findCamera"), t("home.featureComing"))}
          />
          <QuickActionButton
            icon={<AlertTriangle size={24} color={colors.shared.warning} />}
            label={t("home.criticalAlerts")}
            onPress={() => Alert.alert(t("home.criticalAlerts"), t("home.featureComing"))}
          />
        </View>

        {/* Arm/Disarm toggle */}
        <Text style={styles.sectionTitle}>Système</Text>
        <View style={styles.armSection}>
          <ArmDisarmToggle
            armed={armed}
            onToggle={handleArmToggle}
          />
          <View style={styles.wifiStatus}>
            <Wifi size={16} color={wifiConnected ? colors.shared.success : colors.shared.destructive} />
            <Text style={[styles.wifiText, { color: wifiConnected ? colors.shared.success : colors.shared.destructive }]}>
              {wifiConnected ? "WiFi connecté" : "WiFi déconnecté"}
            </Text>
            {currentSsid && (
              <Text style={styles.ssidText}>{currentSsid}</Text>
            )}
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingGrid}>
            {[1, 2].map((i) => (
              <View key={i} style={styles.skeleton} />
            ))}
          </View>
        ) : stats ? (
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>{t("home.siteOverview")}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {stats.cameras.online}/{stats.cameras.total}
                </Text>
                <Text style={styles.statLabel}>{t("home.camerasOnline")}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.alerts.open}</Text>
                <Text style={styles.statLabel}>{t("home.activeAlerts")}</Text>
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
  armSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.dark.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 20,
    marginBottom: 24,
  },
  wifiStatus: {
    alignItems: "center",
    gap: 4,
  },
  wifiText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ssidText: {
    fontSize: 11,
    color: colors.dark.textMuted,
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
