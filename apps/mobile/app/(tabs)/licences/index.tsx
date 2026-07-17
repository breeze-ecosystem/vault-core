import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput } from "react-native";
import FlashList from "@shopify/flash-list";
import { listLicenses, activateLicense, type LicenseInfoDto } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Key, CheckCircle, Clock, Plus, RefreshCw, ShieldAlert } from "lucide-react-native";

function formatDate(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function getDaysUntil(ts: string): number {
  return Math.ceil((new Date(ts).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function LicencesScreen() {
  const { t } = useTranslation();
  const [licenses, setLicenses] = useState<LicenseInfoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await listLicenses();
      setLicenses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(t("licences.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleActivate = () => {
    Alert.prompt(
      t("licences.activate"),
      t("licences.activatePrompt"),
      async (licenseKey: string) => {
        if (!licenseKey?.trim()) return;
        setActivating(true);
        try {
          await activateLicense(licenseKey.trim());
          Alert.alert(t("common.success"), t("licences.activateSuccess"));
          await loadData();
        } catch (e) {
          Alert.alert(t("common.error"), e instanceof Error ? e.message : t("licences.loadingError"));
        } finally {
          setActivating(false);
        }
      },
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

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Key size={20} color={colors.primary} />
        <Text style={styles.title}>{t("licences.title")}</Text>
      </View>

      <TouchableOpacity style={styles.activateBtn} onPress={handleActivate} disabled={activating}>
        {activating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Plus size={18} color="#fff" />
            <Text style={styles.activateBtnText}>{t("licences.activate")}</Text>
          </>
        )}
      </TouchableOpacity>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh}>
            <RefreshCw size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <FlashList
        data={licenses}
        renderItem={({ item }) => {
          const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
          const daysLeft = item.expiresAt ? getDaysUntil(item.expiresAt) : 0;
          return (
            <View style={styles.card}>
              <View style={[styles.cardLeft, { backgroundColor: isExpired ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)" }]}>
                {isExpired ? <ShieldAlert size={20} color="#ef4444" /> : <CheckCircle size={20} color="#22c55e" />}
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={styles.statusBadge}>
                    {isExpired ? t("licences.expired") : t("licences.active")}
                  </Text>
                </View>
                <Text style={styles.licenseKey}>
                  {item.licenseJwt.substring(0, 16)}...
                </Text>
                <Text style={styles.seats}>
                  {t("licences.seats")}: Caméras {item.maxCameras} · Portes {item.maxDoors}
                </Text>
                <Text style={styles.expiry}>
                  {isExpired
                    ? `${t("licences.expired")} ${formatDate(item.expiresAt)}`
                    : `${t("licences.expiresAt")} ${formatDate(item.expiresAt)} (${daysLeft}j)`}
                </Text>
              </View>
            </View>
          );
        }}
        estimatedItemSize={110}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Key size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("licences.empty")}</Text>
          </View>
        }
        ListFooterComponent={() => <View style={{ height: 24 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  headerBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.h2, flex: 1 },
  activateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.primary, borderRadius: borderRadius.md },
  activateBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  scroll: { padding: spacing.lg, paddingTop: spacing.md },
  errorBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md },
  errorText: { ...typography.caption, color: colors.destructive, flex: 1 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md },
  cardLeft: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: "row", marginBottom: 4 },
  statusBadge: { ...typography.label, fontSize: 11, color: colors.textMuted },
  licenseKey: { ...typography.body, fontWeight: "500", fontFamily: "monospace", fontSize: 13 },
  seats: { ...typography.small, marginTop: 2 },
  expiry: { ...typography.small, color: colors.textMuted, marginTop: 1 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
});
