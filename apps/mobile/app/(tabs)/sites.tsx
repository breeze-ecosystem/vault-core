import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { fetchSites, type SiteItem } from "@/lib/api";
import { siteStatusColor } from "@/lib/constants";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { MapPin, ChevronRight, Camera } from "lucide-react-native";

const PAGE_SIZE = 20;

export default function SitesScreen() {
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
      setError(e instanceof Error ? e.message : "Erreur de chargement");
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
        <Text style={styles.loadingText}>Chargement des sites...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshSites} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <MapPin size={20} color={colors.primary} />
        <Text style={styles.title}>Sites</Text>
        <Text style={styles.count}>{sites.length}{total > sites.length ? ` / ${total}` : ""}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {sites.map((site) => {
        const cameraCount = site._count?.cameras ?? site.cameras?.length ?? 0;
        return (
          <TouchableOpacity key={site.id} style={styles.card} onPress={() => handleSitePress(site)} activeOpacity={0.7}>
            <View style={styles.cardRow}>
              <View style={[styles.statusDot, { backgroundColor: siteStatusColor(site.isActive) }]} />
              <View style={styles.cardContent}>
                <Text style={styles.siteName}>{site.name}</Text>
                {(site.city || site.country) && (
                  <Text style={styles.siteLocation}>
                    {[site.city, site.country].filter(Boolean).join(", ")}
                  </Text>
                )}
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.metaItem}>
                <Camera size={12} color={colors.primary} />
                <Text style={styles.metaText}> {cameraCount} caméra{cameraCount !== 1 ? "s" : ""}</Text>
              </View>
              <Text style={[styles.statusText, { color: site.isActive ? colors.success : colors.textMuted }]}>
                {site.isActive ? "Actif" : "Inactif"}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {!loading && !error && sites.length === 0 && (
        <View style={styles.empty}>
          <MapPin size={40} color={colors.border} />
          <Text style={styles.emptyTitle}>Aucun site configuré</Text>
          <Text style={styles.emptyHint}>Ajoutez des sites depuis le tableau de bord</Text>
        </View>
      )}

      {sites.length < total && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
          {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>Charger plus ({total - sites.length} restants)</Text>}
        </TouchableOpacity>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
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
