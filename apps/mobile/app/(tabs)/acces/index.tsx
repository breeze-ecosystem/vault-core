import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import FlashList from "@shopify/flash-list";
import {
  fetchCredentials,
  fetchAccessZones,
  fetchAccessSchedules,
  deactivateCredential,
  type AccessCredentialDto,
  type AccessZoneDto,
  type AccessScheduleDto,
} from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Shield, Key, Clock, ChevronRight, RefreshCw } from "lucide-react-native";

type Tab = "credentials" | "zones" | "schedules";

const TYPE_COLORS: Record<string, string> = {
  BADGE: "#06b6d4",
  PIN: "#a855f7",
  MOBILE: "#10b981",
  QR: "#f59e0b",
};

function formatDate(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AccesScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("credentials");
  const [credentials, setCredentials] = useState<AccessCredentialDto[]>([]);
  const [zones, setZones] = useState<AccessZoneDto[]>([]);
  const [schedules, setSchedules] = useState<AccessScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [credData, zoneData, schedData] = await Promise.all([
        fetchCredentials({ limit: 50 }).catch(() => ({ data: [], total: 0, page: 1, limit: 50 })),
        fetchAccessZones().catch(() => []),
        fetchAccessSchedules().catch(() => []),
      ]);
      setCredentials(credData.data || []);
      setZones(Array.isArray(zoneData) ? zoneData : []);
      setSchedules(Array.isArray(schedData) ? schedData : []);
    } catch (e) {
      setError(t("acces.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleDeactivate = (cred: AccessCredentialDto) => {
    Alert.alert(
      t("acces.deactivate"),
      `${cred.user?.firstName || ""} ${cred.user?.lastName || ""} — ${t("acces.credentialTypes." + cred.type as any) || cred.type}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("acces.deactivate"),
          style: "destructive",
          onPress: async () => {
            try {
              await deactivateCredential(cred.id);
              setCredentials(prev => prev.filter(c => c.id !== cred.id));
            } catch { Alert.alert(t("common.error"), t("acces.loadingError")); }
          },
        },
      ],
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "credentials", label: t("acces.credentials"), count: credentials.length },
    { key: "zones", label: t("acces.zones"), count: zones.length },
    { key: "schedules", label: t("acces.schedules"), count: schedules.length },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerRow}>
          <Shield size={20} color={colors.primary} />
          <Text style={styles.title}>{t("acces.title")}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
            <RefreshCw size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === "credentials" && (
        <FlashList
          data={credentials}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onLongPress={() => handleDeactivate(item)}>
              <View style={[styles.typeIndicator, { backgroundColor: TYPE_COLORS[item.type] || colors.textMuted }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={[styles.typeBadge, { color: TYPE_COLORS[item.type] || colors.textMuted }]}>
                    {t(`acces.credentialTypes.${item.type}` as any) || item.type}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: item.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }]}>
                    <Text style={[styles.statusText, { color: item.isActive ? "#22c55e" : "#ef4444" }]}>
                      {item.isActive ? t("acces.status.active") : t("acces.status.inactive")}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userName}>
                  {item.user ? `${item.user.firstName} ${item.user.lastName}` : "—"}
                </Text>
                <Text style={styles.validity}>
                  {t("acces.validity")}: {formatDate(item.validFrom)} → {formatDate(item.validUntil)}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          estimatedItemSize={90}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={styles.scroll}
          ListHeaderComponent={() => <View style={{ height: spacing.sm }} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Key size={40} color={colors.border} />
              <Text style={styles.emptyText}>{t("acces.empty")}</Text>
            </View>
          }
          ListFooterComponent={() => <View style={{ height: 24 }} />}
        />
      )}

      {activeTab === "zones" && (
        <FlashList
          data={zones}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.typeIndicator, { backgroundColor: colors.primary }]} />
              <View style={styles.cardContent}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.validity}>{item.description || `Site: ${item.siteId}`}</Text>
              </View>
            </View>
          )}
          estimatedItemSize={70}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={styles.scroll}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Shield size={40} color={colors.border} />
              <Text style={styles.emptyText}>{t("acces.empty")}</Text>
            </View>
          }
          ListFooterComponent={() => <View style={{ height: 24 }} />}
        />
      )}

      {activeTab === "schedules" && (
        <FlashList
          data={schedules}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.typeIndicator, { backgroundColor: "#f59e0b" }]} />
              <View style={styles.cardContent}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.validity}>
                  {item.entries?.length || 0} créneau{item.entries?.length !== 1 ? "x" : ""}
                </Text>
              </View>
              <Clock size={16} color={colors.textMuted} />
            </View>
          )}
          estimatedItemSize={70}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={refresh}
          contentContainerStyle={styles.scroll}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Clock size={40} color={colors.border} />
              <Text style={styles.emptyText}>{t("acces.empty")}</Text>
            </View>
          }
          ListFooterComponent={() => <View style={{ height: 24 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h2, flex: 1 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary + "20", borderColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: "600" },
  tabTextActive: { color: colors.primary },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  errorBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md },
  errorText: { ...typography.caption, color: colors.destructive, flex: 1 },
  retryBtn: { padding: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
  },
  typeIndicator: { width: 4, alignSelf: "stretch" },
  cardContent: { flex: 1, padding: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  typeBadge: { ...typography.label, fontSize: 11, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: "600" },
  userName: { ...typography.body, fontWeight: "500", marginBottom: 2 },
  validity: { ...typography.small, marginTop: 2 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
});
