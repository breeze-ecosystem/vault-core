import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchVehicleEvents, type VehicleEventDto } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Car, Search, Shield, ShieldCheck, ShieldOff, RefreshCw, Image as ImageIcon } from "lucide-react-native";

const PAGE_SIZE = 20;

function formatDate(ts: string): string {
  return new Date(ts).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getDecisionColor(decision: string): { color: string; bg: string } {
  switch (decision) {
    case "ALLOW": return { color: "#22c55e", bg: "rgba(34,197,94,0.15)" };
    case "DENY": return { color: "#ef4444", bg: "rgba(239,68,68,0.15)" };
    default: return { color: "#6b7280", bg: "rgba(107,114,128,0.15)" };
  }
}

export default function VehiculesScreen() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<VehicleEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPlate, setSearchPlate] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadEvents = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchVehicleEvents({
        plate: searchPlate || undefined,
        limit: PAGE_SIZE,
        page: pageNum,
      });
      if (append) setEvents(prev => [...prev, ...result.data]);
      else setEvents(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(t("vehicules.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t, searchPlate]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const refresh = async () => {
    setRefreshing(true);
    await loadEvents(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || events.length >= total) return;
    loadEvents(page + 1, true);
  };

  const handleSearch = () => {
    setEvents([]);
    loadEvents(1);
  };

  if (loading && events.length === 0) {
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
        <Car size={20} color={colors.primary} />
        <Text style={styles.title}>{t("vehicules.title")}</Text>
      </View>

      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("vehicules.search")}
          placeholderTextColor={colors.textMuted}
          value={searchPlate}
          onChangeText={setSearchPlate}
          onSubmitEditing={handleSearch}
          autoCapitalize="characters"
          returnKeyType="search"
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh}>
            <RefreshCw size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <FlashList
        data={events}
        renderItem={({ item }) => {
          const decisionStyle = getDecisionColor(item.decision);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.plate}>{item.plate}</Text>
                <View style={[styles.decisionBadge, { backgroundColor: decisionStyle.bg }]}>
                  {item.decision === "ALLOW" ? (
                    <ShieldCheck size={12} color={decisionStyle.color} />
                  ) : item.decision === "DENY" ? (
                    <ShieldOff size={12} color={decisionStyle.color} />
                  ) : (
                    <Shield size={12} color={decisionStyle.color} />
                  )}
                  <Text style={[styles.decisionText, { color: decisionStyle.color }]}>
                    {t(`vehicules.decisions.${item.decision}` as any) || item.decision}
                  </Text>
                </View>
              </View>
              <Text style={styles.siteTime}>
                {t("vehicules.lastSeen")}: {formatDate(item.time)}
              </Text>
              {item.imageUrl && (
                <TouchableOpacity style={styles.imageBtn} onPress={() => Alert.alert(t("vehicules.img"), item.imageUrl || "")}>
                  <ImageIcon size={14} color={colors.primary} />
                  <Text style={styles.imageBtnText}>{t("vehicules.img")}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        estimatedItemSize={90}
        keyExtractor={(item) => `${item.time}-${item.plate}`}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Car size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("vehicules.empty")}</Text>
          </View>
        }
        ListFooterComponent={
          events.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("common.loading")}</Text>}
            </TouchableOpacity>
          ) : <View style={{ height: 24 }} />
        }
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
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  searchInput: { flex: 1, paddingVertical: spacing.sm, color: colors.text, fontSize: 14, fontFamily: "monospace", textTransform: "uppercase" },
  scroll: { padding: spacing.lg, paddingTop: spacing.sm },
  errorBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md },
  errorText: { ...typography.caption, color: colors.destructive, flex: 1 },
  card: { backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  plate: { ...typography.h2, fontFamily: "monospace", letterSpacing: 2, fontSize: 18 },
  decisionBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  decisionText: { fontSize: 12, fontWeight: "700" },
  siteTime: { ...typography.small, marginBottom: spacing.xs },
  imageBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  imageBtnText: { ...typography.small, color: colors.primary },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
  loadMoreBtn: { padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: "center", marginTop: spacing.sm },
  loadMoreText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
