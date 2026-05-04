import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { fetchCameras, type CameraItem } from "@/lib/api";
import { CameraCard } from "@/components/camera-card";

export default function CamerasScreen() {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCameras() {
    try {
      setLoading(true);
      const result = await fetchCameras();
      setCameras(result.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCameras();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCameras} tintColor="#2563eb" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Cameras</Text>
        <Text style={styles.subtitle}>{cameras.length} cameras</Text>
      </View>

      {cameras.map((camera) => (
        <CameraCard key={camera.id} camera={camera} />
      ))}

      {!loading && cameras.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune camera configuree</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", color: "#ededed" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 2 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
});
