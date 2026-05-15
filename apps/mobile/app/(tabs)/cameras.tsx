import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { fetchCameras, type CameraItem } from "@/lib/api";
import { CameraCard } from "@/components/camera-card";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { Camera } from "lucide-react-native";

const PAGE_SIZE = 20;

export default function CamerasScreen() {
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
      setError(e instanceof Error ? e.message : "Erreur de chargement");
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
        <Text style={styles.loadingText}>Chargement des caméras...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshCameras} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Camera size={20} color={colors.primary} />
        <Text style={styles.title}>Caméras</Text>
        <Text style={styles.count}>
          {cameras.length}{total > cameras.length ? ` / ${total}` : ""}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {cameras.map((camera) => (
        <CameraCard key={camera.id} camera={camera} />
      ))}

      {!loading && !error && cameras.length === 0 && (
        <View style={styles.empty}>
          <Camera size={40} color={colors.border} />
          <Text style={styles.emptyTitle}>Aucune caméra configurée</Text>
          <Text style={styles.emptyHint}>Ajoutez des caméras depuis le tableau de bord</Text>
        </View>
      )}

      {cameras.length < total && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
          {loadingMore ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loadMoreText}>Charger plus ({total - cameras.length} restantes)</Text>
          )}
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
