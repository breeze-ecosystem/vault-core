import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  Alert, ScrollView, RefreshControl,
} from "react-native";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  fetchCameraById, fetchCameraAlerts, captureSnapshot,
  startCameraIngestion, stopCameraIngestion,
  type CameraItem, type AlertItem,
} from "@/lib/api";
import { statusColors, statusLabels, severityColors } from "@/lib/constants";

export default function CameraDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [camera, setCamera] = useState<CameraItem | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoRef, setVideoRef] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [ingestionLoading, setIngestionLoading] = useState(false);

  const loadCamera = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [cameraResult, alertsResult] = await Promise.all([
        fetchCameraById(id),
        fetchCameraAlerts(id, { limit: 20 }),
      ]);
      setCamera(cameraResult);
      setAlerts(alertsResult.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadCamera(); }, [loadCamera]);

  const refresh = async () => {
    setRefreshing(true); await loadCamera(); setRefreshing(false);
  };

  const handleSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const result = await captureSnapshot(id);
      if (result.image) {
        Alert.alert("Capture", "Image capturee avec succes");
      }
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Capture impossible");
    } finally { setSnapshotLoading(false); }
  };

  const handleToggleIngestion = async () => {
    setIngestionLoading(true);
    try {
      if (camera?.isRecording) await stopCameraIngestion(id);
      else await startCameraIngestion(id);
      await loadCamera();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Action impossible");
    } finally { setIngestionLoading(false); }
  };

  const togglePlay = async () => {
    if (videoRef) {
      if (isPlaying) { await videoRef.pauseAsync(); setIsPlaying(false); }
      else { setVideoError(false); await videoRef.playAsync(); setIsPlaying(true); }
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) { setIsPlaying(status.isPlaying); }
    else if (status.error) { setVideoError(true); setIsPlaying(false); }
  };

  const streamUrl = `${process.env.EXPO_PUBLIC_STREAM_URL || ""}/stream/${id}.m3u8`;

  if (loading && !camera) {
    return <View style={styles.centered}><ActivityIndicator color="#2563eb" size="large" /><Text style={styles.loadingText}>Chargement de la camera...</Text></View>;
  }
  if (error) {
    return <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={loadCamera} style={styles.retryBtn}><Text style={styles.retryText}>Reessayer</Text></TouchableOpacity></View>;
  }
  if (!camera) { return <View style={styles.centered}><Text style={{ color: "#888" }}>Aucune donnee</Text></View>; }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563eb" />}>
      <View style={styles.header}>
        <Text style={styles.title}>{camera.name}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[camera.status] ?? "#6b7280" }]} />
          <Text style={styles.statusText}>{statusLabels[camera.status] ?? camera.status}</Text>
        </View>
      </View>

      <View style={styles.videoContainer}>
        {streamUrl ? (
          <Video ref={setVideoRef} style={styles.video} source={{ uri: streamUrl }}
            rate={1.0} volume={1.0} isMuted={false} resizeMode={ResizeMode.CONTAIN}
            isLooping useNativeControls={false} onPlaybackStatusUpdate={onPlaybackStatusUpdate} />
        ) : null}
        {!isPlaying && !videoError && (
          <TouchableOpacity onPress={togglePlay} style={styles.playOverlay} accessibilityLabel="Lire le flux">
            <Ionicons name="play-circle" size={64} color="#fff" />
          </TouchableOpacity>
        )}
        {videoError && (
          <View style={styles.playOverlay}>
            <Text style={styles.videoErrorText}>Flux indisponible</Text>
            <TouchableOpacity onPress={togglePlay} style={styles.retrySmallBtn}><Text style={styles.retrySmallText}>Reessayer</Text></TouchableOpacity>
          </View>
        )}
        {isPlaying && (
          <TouchableOpacity onPress={togglePlay} style={styles.pauseOverlay} accessibilityLabel="Mettre en pause">
            <Ionicons name="pause" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={handleSnapshot} style={styles.actionBtn} disabled={snapshotLoading}>
          {snapshotLoading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera" size={20} color="#fff" />}
          <Text style={styles.actionBtnText}>Capture</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleIngestion} style={[styles.actionBtn, camera.isRecording ? styles.stopBtn : styles.startBtn]} disabled={ingestionLoading}>
          {ingestionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name={camera.isRecording ? "stop-circle" : "play-circle"} size={20} color="#fff" />}
          <Text style={styles.actionBtnText}>{camera.isRecording ? "Arreter" : "Analyser"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Site:</Text><Text style={styles.infoValue}>{camera.site?.name ?? "Site inconnu"}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Resolution:</Text><Text style={styles.infoValue}>{camera.resolution ?? "N/A"} · {camera.fps} fps</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Analyse:</Text><Text style={styles.infoValue}>{camera.isRecording ? "Active" : "Inactive"}</Text></View>
      </View>

      <View style={styles.alertsSection}>
        <Text style={styles.sectionTitle}>Alertes recentes ({alerts.length})</Text>
        {alerts.length === 0 ? (
          <Text style={styles.alertsEmpty}>Aucune alerte pour cette camera</Text>
        ) : (
          alerts.map(alert => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <View style={[styles.alertBadge, { backgroundColor: severityColors[alert.severity] ?? "#6b7280" }]}>
                  <Text style={styles.alertBadgeText}>{alert.severity}</Text>
                </View>
              </View>
              {alert.description && <Text style={styles.alertDescription}>{alert.description}</Text>}
              <View style={styles.alertFooter}>
                <Text style={styles.alertTime}>{new Date(alert.createdAt).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Text>
                <Text style={styles.alertCamera}>Camera: {alert.camera?.name ?? "Inconnue"}</Text>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  loadingText: { color: "#888", marginTop: 12, fontSize: 14 },
  errorBox: { margin: 20, padding: 16, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "#ef4444" },
  errorText: { color: "#ef4444", textAlign: "center" },
  retryBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#2563eb", borderRadius: 6 },
  retryText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  header: { padding: 20, paddingBottom: 10, borderBottomWidth: 1, borderColor: "#333" },
  title: { fontSize: 24, fontWeight: "bold", color: "#ededed" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: "#888", fontSize: 14, marginLeft: 6 },
  videoContainer: { height: 250, margin: 16, borderRadius: 10, overflow: "hidden", backgroundColor: "#000" },
  video: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  playOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  pauseOverlay: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  videoErrorText: { color: "#ef4444", fontSize: 16, marginBottom: 8 },
  retrySmallBtn: { paddingVertical: 6, paddingHorizontal: 16, backgroundColor: "#2563eb", borderRadius: 6 },
  retrySmallText: { color: "#fff", fontWeight: "600" },
  actionsRow: { flexDirection: "row", gap: 12, marginHorizontal: 16 },
  actionBtn: { flex: 1, flexDirection: "row", padding: 12, borderRadius: 8, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#3b82f6" },
  startBtn: { backgroundColor: "#16a34a" },
  stopBtn: { backgroundColor: "#dc2626" },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  infoSection: { marginHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#ededed", marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderColor: "#333" },
  infoLabel: { fontSize: 14, color: "#888" },
  infoValue: { fontSize: 14, fontWeight: "500", color: "#ededed" },
  alertsSection: { marginHorizontal: 16, marginTop: 24 },
  alertsEmpty: { textAlign: "center", color: "#888", fontStyle: "italic", paddingVertical: 20 },
  alertCard: { marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: "#111", borderWidth: 1, borderColor: "#333" },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  alertTitle: { fontSize: 16, fontWeight: "600", color: "#ededed" },
  alertBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  alertBadgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  alertDescription: { fontSize: 14, color: "#ccc", marginVertical: 8 },
  alertFooter: { flexDirection: "row", justifyContent: "space-between" },
  alertTime: { color: "#888", fontSize: 12 },
  alertCamera: { color: "#888", fontSize: 12 },
});
