import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { fetchCameras, type CameraItem } from "@/lib/api";
import { CameraCard } from "@/components/camera-card";

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
    return <View style={styles.centered}><ActivityIndicator color="#2563eb" size="large" /><Text style={styles.loadingText}>Chargement des cameras...</Text></View>;
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshCameras} tintColor="#2563eb" />}>
      <View style={styles.header}>
        <Text style={styles.title}>Cameras</Text>
        <Text style={styles.subtitle}>{cameras.length}{total > cameras.length ? ` / ${total}` : ""} camera{cameras.length !== 1 ? "s" : ""}</Text>
      </View>
      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      {cameras.map((camera) => <CameraCard key={camera.id} camera={camera} />)}
      {!loading && !error && cameras.length === 0 && (
        <View style={styles.empty}><Text style={styles.emptyText}>Aucune camera configuree</Text><Text style={styles.emptyHint}>Ajoutez des cameras depuis le tableau de bord</Text></View>
      )}
      {cameras.length < total && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
          {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>Charger plus ({total - cameras.length} restantes)</Text>}
        </TouchableOpacity>
      )}
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  loadingText: { color: "#888", marginTop: 12, fontSize: 14 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", color: "#ededed" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 2 },
  errorBox: { marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 14 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
  emptyHint: { color: "#666", fontSize: 12, marginTop: 4 },
  loadMoreBtn: { margin: 20, padding: 12, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  loadMoreText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  spacer: { height: 40 },
});
