import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchCameraById, captureSnapshot, type CameraItem } from "@/lib/api";
import { getCameraStreamUrl } from "@/lib/api-extensions";
import { LiveStreamViewer } from "@/components/live-stream-viewer";
import { colors, typography, spacing } from "@/lib/theme";

type ScreenState = "loading" | "ready" | "error";

export default function CameraLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [camera, setCamera] = useState<CameraItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCamera = useCallback(async () => {
    if (!id) return;
    try {
      setScreenState("loading");
      setError(null);
      const cam = await fetchCameraById(id);
      setCamera(cam);
      setScreenState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
      setScreenState("error");
    }
  }, [id]);

  useEffect(() => {
    loadCamera();
  }, [loadCamera]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSnapshot = useCallback(async () => {
    if (!id) return;
    try {
      const result = await captureSnapshot(id);
      Alert.alert("Capture", "Image capturée avec succès");
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Capture impossible");
    }
  }, [id]);

  const handleRetry = useCallback(() => {
    loadCamera();
  }, [loadCamera]);

  // Loading state
  if (screenState === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Chargement de la caméra...</Text>
      </View>
    );
  }

  // Error state
  if (screenState === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Impossible de charger la caméra"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera offline state
  if (camera && camera.status !== "ONLINE" && camera.status !== "DEGRADED") {
    return (
      <View style={styles.centered}>
        <Text style={styles.offlineTitle}>Caméra hors ligne</Text>
        <Text style={styles.offlineSubtitle}>
          Statut: {camera.status}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Ready: show LiveStreamViewer
  const streamUrl = camera ? getCameraStreamUrl(camera.id, "HD") : "";
  const substreamUrl = camera ? getCameraStreamUrl(camera.id, "SD") : undefined;

  return (
    <View style={styles.container}>
      {streamUrl ? (
        <LiveStreamViewer
          streamUrl={streamUrl}
          cameraName={camera?.name ?? "Caméra"}
          substreamUrl={substreamUrl}
          onBack={handleBack}
          onSnapshot={handleSnapshot}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.offlineTitle}>Flux non disponible</Text>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.destructive,
    textAlign: "center",
  },
  offlineTitle: {
    ...typography.heading,
    color: colors.text,
    textAlign: "center",
  },
  offlineSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 10,
    marginTop: spacing.sm,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  backBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
});
