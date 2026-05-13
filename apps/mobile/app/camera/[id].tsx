import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Video } from "expo-av";
import { useLocalSearchParams } from "expo-router";
import { fetchCameraById, fetchCameraAlerts, CameraItem, AlertItem } from "@/lib/api";

export default function CameraDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [camera, setCamera] = useState<CameraItem | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoRef, setVideoRef] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadCamera = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cameraResult, alertsResult] = await Promise.all([
        fetchCameraById(id),
        fetchCameraAlerts(id, 20),
      ]);
      setCamera(cameraResult);
      setAlerts(alertsResult.data);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCamera();
  }, [id]);

  const handleSnapshot = () => {
    Alert.alert(
      "Capture d'écran",
      "La capture d'écran sera enregistrée dans votre galerie.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "OK", onPress: () => {} },
      ]
    );
  };

  const togglePlay = async () => {
    if (videoRef) {
      if (isPlaying) {
        await videoRef.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const streamUrl = `${process.env.EXPO_PUBLIC_STREAM_URL || "http://localhost:1984"}/stream/${id}.m3u8`;

  if (loading && !camera) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Chargement de la camera...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadCamera} style={styles.retryBtn}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!camera) {
    return <View style={styles.centered}><Text>Aucune donnée</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{camera.name}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[camera.status] }]} />
          <Text style={styles.statusText}>{statusLabels[camera.status]}</Text>
        </View>
      </View>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        <Video
          ref={setVideoRef}
          style={StyleSheet.absoluteFill}
          source={{ uri: streamUrl }}
          rate={1.0}
          volume={1.0}
          isMuted={false}
          resizeMode="contain"
          isLooping
          useNativeControls={false}
          onPlaybackStatusUpdate={status => {
            setIsPlaying(status.isPlaying);
          }}
        />
        {!isPlaying && (
          <TouchableOpacity onPress={togglePlay} style={styles.playOverlay}>
            <Text style={styles.playText}>▶️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Camera Info */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Site:</Text>
          <Text style={styles.infoValue}>{camera.site?.name ?? "Site inconnu"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Résolution:</Text>
          <Text style={styles.infoValue}>
            {camera.resolution ?? "Non disponible"} · {camera.fps} fps
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Enregistrement:</Text>
          <Text style={styles.infoValue}>
            {camera.isRecording ? "Actif" : "Inactif"}
          </Text>
        </View>
      </View>

      {/* Snapshot Button */}
      <TouchableOpacity onPress={handleSnapshot} style={styles.snapshotBtn}>
        <Text style={styles.snapshotText}>📸 Capture d'écran</Text>
      </TouchableOpacity>

      {/* Alerts Section */}
      <View style={styles.alertsSection}>
        <Text style={styles.sectionTitle}>Alertes récentes ({alerts.length})</Text>
        {alerts.length === 0 ? (
          <Text style={styles.alertsEmpty}>Aucune alerte pour cette camera</Text>
        ) : (
          <>
            {alerts.map(alert => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <View style={[styles.alertBadge, { backgroundColor: severityColors[alert.severity] }]}>
                    {alert.severity}
                  </View>
                </View>
                {alert.description && (
                  <Text style={styles.alertDescription}>{alert.description}</Text>
                )}
                <View style={styles.alertFooter}>
                  <Text style={styles.alertTime}>
                    {new Date(alert.createdAt).toLocaleString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Text style={styles.alertCamera}>
                    Camera: {alert.camera?.name ?? "Inconnue"}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const statusColors: Record<string, string> = {
  ONLINE: "#22c55e",
  OFFLINE: "#dc2626",
  MAINTENANCE: "#f97316",
  DEGRADED: "#eab308",
};

const statusLabels: Record<string, string> = {
  ONLINE: "En ligne",
  OFFLINE: "Hors ligne",
  MAINTENANCE: "Maintenance",
  DEGRADED: "Dégradé",
};

const severityColors: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
  INFO: "#3b82f6",
};

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
  playOverlay: { position: "absolute", ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  playText: { fontSize: 48, color: "#fff" },

  infoSection: { marginHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#ededed", marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderColor: "#333" },
  infoLabel: { fontSize: 14, color: "#888" },
  infoValue: { fontSize: 14, fontWeight: "500", color: "#ededed" },

  snapshotBtn: { margin: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: "#3b82f6", borderRadius: 8, alignItems: "center" },
  snapshotText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  alertsSection: { marginHorizontal: 16, marginTop: 24 },
  alertsEmpty: { textAlign: "center", color: "#888", fontStyle: "italic", paddingVertical: 20 },
  alertCard: { marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: "#111", borderWidth: 1, borderColor: "#333" },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  alertTitle: { fontSize: 16, fontWeight: "600", color: "#ededed" },
  alertBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: "600", color: "#fff" },
  alertDescription: { fontSize: 14, color: "#ccc", marginVertical: 8 },
  alertFooter: { flexDirection: "row", justifyContent: "space-between", fontSize: 12, color: "#888" },
  alertTime: {},
  alertCamera: {},
});