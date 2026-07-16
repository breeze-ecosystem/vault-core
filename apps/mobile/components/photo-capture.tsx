import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";

type CaptureState = "preview" | "capturing" | "review";

interface PhotoCaptureProps {
  onPhotoCaptured: (photoUri: string) => void;
  onError?: (error: string) => void;
}

export function PhotoCapture({ onPhotoCaptured, onError }: PhotoCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [captureState, setCaptureState] = useState<CaptureState>("preview");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      setCaptureState("capturing");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setCaptureState("review");
      } else {
        throw new Error("Impossible de capturer la photo");
      }
    } catch (err: any) {
      setCaptureState("preview");
      const msg = err.message || "Erreur de capture";
      onError?.(msg);
    }
  }, [onError]);

  const confirmPhoto = useCallback(() => {
    if (photoUri) {
      onPhotoCaptured(photoUri);
    }
  }, [photoUri, onPhotoCaptured]);

  const retakePhoto = useCallback(() => {
    setPhotoUri(null);
    setCaptureState("preview");
  }, []);

  const retryPermission = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  // Permission not loaded yet
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.heading}>Permission caméra</Text>
          <Text style={styles.bodyText}>
            Autorisation requise pour capturer des photos.
          </Text>
        </View>
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.heading}>Caméra non autorisée</Text>
          <Text style={styles.bodyText}>
            L'accès à la caméra est requis pour capturer des preuves
            photographiques.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={retryPermission}>
            <Text style={styles.permissionButtonText}>
              Autoriser la caméra
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Review state - show captured photo
  if (captureState === "review" && photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.previewImage} />
        <View style={styles.reviewActions}>
          <Text style={styles.reviewTitle}>Photo capturée</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
              <Text style={styles.retakeButtonText}>Reprendre</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={confirmPhoto}>
              <Text style={styles.confirmButtonText}>Utiliser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Camera preview
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.captureArea}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                captureState === "capturing" && styles.capturingButton,
              ]}
              onPress={takePicture}
              disabled={captureState === "capturing"}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: spacing.xl * 2,
  },
  captureArea: {
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  capturingButton: {
    opacity: 0.5,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
  },
  previewImage: {
    flex: 1,
    resizeMode: "contain",
    backgroundColor: "#000000",
  },
  reviewActions: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
  },
  retakeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  retakeButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  confirmButtonText: {
    ...typography.body,
    color: "#ffffff",
    fontWeight: "600",
  },
  heading: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  permissionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  permissionButtonText: {
    ...typography.body,
    color: "#ffffff",
    fontWeight: "600",
  },
});
