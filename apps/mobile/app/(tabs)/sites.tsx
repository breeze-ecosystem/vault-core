import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import FlashList from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { fetchSites, type SiteItem } from "@/lib/api";
import { siteStatusColor } from "@/lib/constants";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { MapPin, ChevronRight, Camera } from "lucide-react-native";

const PAGE_SIZE = 20;

export default function SitesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadSites = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchSites({ page: pageNum, limit: PAGE_SIZE });
      if (append) setSites(prev => [...prev, ...result.data]);
      else setSites(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("sites.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);
  const refreshSites = async () => { setRefreshing(true); await loadSites(1); setRefreshing(false); };
  const loadMore = () => { if (loadingMore || sites.length >= total) return; loadSites(page + 1, true); };
  const handleSitePress = (site: SiteItem) => router.push(`/(tabs)/cameras?siteId=${site.id}`);

  if (loading && sites.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("sites.loading")}</Text>
      </View>
    );
  }

  const renderSiteItem = ({ item }: { item: SiteItem }) => {
    const cameraCount = item._count?.cameras ?? item.cameras?.length ?? 0;
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleSitePress(item)} activeOpacity={0.7}>
        <View style={styles.cardRow}>
          <View style={[styles.statusDot, { backgroundColor: siteStatusColor(item.isActive) }]} />
          <View style={styles.cardContent}>
            <Text style={styles.siteName}>{item.name}</Text>
            {(item.city || item.country) && (
              <Text style={styles.siteLocation}>
                {[item.city, item.country].filter(Boolean).join(", ")}
              </Text>
            )}
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Camera size={12} color={colors.primary} />
            <Text style={styles.metaText}> {cameraCount} {cameraCount !== 1 ? t("sites.cameras") : t("sites.camera")}</Text>
          </View>
          <Text style={[styles.statusText, { color: item.isActive ? colors.success : colors.textMuted }]}>
            {item.isActive ? t("sites.active") : t("sites.inactive")}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={sites}
        renderItem={renderSiteItem}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refreshSites}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.header}>
              <MapPin size={20} color={colors.primary} />
              <Text style={styles.title}>{t("sites.title")}</Text>
              <Text style={styles.count}>{sites.length}{total > sites.length ? ` / ${total}` : ""}</Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <MapPin size={40} color={colors.border} />
            <Text style={styles.emptyTitle}>{t("sites.empty")}</Text>
            <Text style={styles.emptyHint}>{t("sites.emptyHint")}</Text>
          </View>
        ) : null}
        ListFooterComponent={
          sites.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("sites.loadMore", { remaining: total - sites.length })}</Text>}
            </TouchableOpacity>
          ) : (
            <View style={{ height: 24 }} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  scroll: { padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  title: { ...typography.h2, flex: 1 },
  count: { ...typography.caption, fontWeight: "600" },
  errorBox: {
    padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: colors.destructive,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.destructive, fontSize: 13 },
  card: {
    backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  cardContent: { flex: 1 },
  siteName: { ...typography.body, fontWeight: "600" },
  siteLocation: { ...typography.small, marginTop: 2 },
  cardFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { ...typography.small, color: colors.primary, fontWeight: "500" },
  statusText: { ...typography.small, fontWeight: "600" },
  empty: { padding: 40, alignItems: "center" },
  emptyTitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  emptyHint: { ...typography.small, marginTop: spacing.xs, textAlign: "center" },
  loadMoreBtn: {
    padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: "center", marginTop: spacing.sm,
  },
  loadMoreText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
