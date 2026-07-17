import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import FlashList from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { fetchCameras, type CameraItem } from "@/lib/api";
import { CameraCard } from "@/components/camera-card";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Camera } from "lucide-react-native";

const PAGE_SIZE = 20;

export default function CamerasScreen() {
  const { t } = useTranslation();
  const { siteId } = useLocalSearchParams<{ siteId?: string }>();
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadCameras = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchCameras({
        siteId: siteId || undefined,
        page: pageNum,
        limit: PAGE_SIZE,
      });
      if (append) setCameras(prev => [...prev, ...result.data]);
      else setCameras(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cameras.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [siteId]);

  useEffect(() => { loadCameras(); }, [loadCameras]);

  const refreshCameras = async () => {
    setRefreshing(true);
    await loadCameras(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || cameras.length >= total) return;
    loadCameras(page + 1, true);
  };

  if (loading && cameras.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("cameras.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={cameras}
        renderItem={({ item }) => <CameraCard camera={item} />}
        estimatedItemSize={140}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refreshCameras}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.header}>
              <Camera size={20} color={colors.primary} />
              <Text style={styles.title}>{t("cameras.title")}</Text>
              <Text style={styles.count}>
                {cameras.length}{total > cameras.length ? ` / ${total}` : ""}
              </Text>
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
            <Camera size={40} color={colors.border} />
            <Text style={styles.emptyTitle}>{t("cameras.empty")}</Text>
            <Text style={styles.emptyHint}>{t("cameras.emptyHint")}</Text>
          </View>
        ) : null}
        ListFooterComponent={
          cameras.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loadMoreText}>{t("cameras.loadMore", { remaining: total - cameras.length })}</Text>
              )}
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
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, flex: 1 },
  count: { ...typography.caption, fontWeight: "600" },
  errorBox: {
    padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1, borderColor: colors.destructive,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.destructive, fontSize: 13 },
  empty: { padding: 40, alignItems: "center" },
  emptyTitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  emptyHint: { ...typography.small, marginTop: spacing.xs, textAlign: "center" },
  loadMoreBtn: {
    padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: "center", marginTop: spacing.sm,
  },
  loadMoreText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
