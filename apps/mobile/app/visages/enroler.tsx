import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import { enrollFace } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { Shield, Camera, RotateCcw, Check, X, User } from "lucide-react-native";

type ScreenState = "camera" | "preview" | "uploading" | "error";

export default function EnrolerVisagePage() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScreenState>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted && !permission?.canAskAgain) {
      setErrorMessage("L'accès à la caméra est nécessaire pour l'enrôlement facial.");
    }
  }, [permission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setState("preview");
      }
    } catch (err) {
      setErrorMessage("Impossible de capturer la photo. Vérifiez les permissions de la caméra.");
      setState("error");
    }
  }, []);

  const handleRetake = useCallback(() => {
    setPhotoUri(null);
    setState("camera");
    setErrorMessage(null);
  }, []);

  const handleEnroll = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Nom requis", "Veuillez entrer un nom pour le visage.");
      return;
    }
    if (!photoUri) return;

    setState("uploading");
    setErrorMessage(null);

    try {
      // Read the photo as base64 using expo-file-system
      const photoBase64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await enrollFace({
        name: name.trim(),
        photoBase64,
        isBlacklisted,
      });

      Alert.alert("Visage enrôlé avec succès", `${name.trim()} a été ajouté à la base.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setErrorMessage("L'enrôlement a échoué. Vérifiez la qualité de la photo et réessayez.");
      setState("preview");
    }
  }, [name, photoUri, isBlacklisted, router]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Shield size={48} color={colors.destructive} />
        <Text style={styles.errorTitle}>Permission requise</Text>
        <Text style={styles.errorText}>
          L'accès à la caméra est nécessaire pour capturer une photo.
        </Text>
        {permission.canAskAgain ? (
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Autoriser la caméra</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.errorText}>
            Veuillez activer la caméra dans les paramètres de l'application.
          </Text>
        )}
      </View>
    );
  }

  if (state === "camera") {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          {/* Face guide overlay oval */}
          <View style={styles.guideOverlay}>
            <View style={styles.ovalFrame}>
              <Text style={styles.guideText}>Placez le visage dans le cadre</Text>
            </View>
          </View>

          {/* Bottom bar */}
          <View style={styles.cameraBar}>
            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  if (state === "uploading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.uploadingText}>Enrôlement en cours...</Text>
      </View>
    );
  }

  // Preview state
  return (
    <View style={styles.container}>
      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="contain" />
      )}

      <View style={styles.form}>
        <View style={styles.nameRow}>
          <User size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.nameInput}
            placeholder="Nom du visage"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={100}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Ajouter à la liste noire</Text>
          <Switch
            value={isBlacklisted}
            onValueChange={setIsBlacklisted}
            trackColor={{ false: colors.border, true: colors.destructive + "60" }}
            thumbColor={isBlacklisted ? colors.destructive : colors.textMuted}
          />
        </View>

        {errorMessage && (
          <Text style={styles.errorMsg}>{errorMessage}</Text>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRetake}>
            <RotateCcw size={16} color={colors.text} />
            <Text style={styles.secondaryButtonText}>Reprendre</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, !name.trim() && styles.buttonDisabled]}
            onPress={handleEnroll}
            disabled={!name.trim()}
          >
            <Check size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Enrôler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  camera: { flex: 1 },
  guideOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ovalFrame: {
    width: 260,
    height: 340,
    borderRadius: 170,
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  guideText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    position: "absolute",
    bottom: -36,
  },
  cameraBar: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  previewImage: {
    flex: 1,
    backgroundColor: "#000",
  },
  form: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  toggleLabel: {
    ...typography.body,
    fontWeight: "500",
    color: colors.text,
  },
  errorMsg: {
    ...typography.caption,
    color: colors.destructive,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    ...typography.body,
    fontWeight: "600",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.elevated,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
  },
  errorTitle: {
    ...typography.heading,
    color: colors.destructive,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  uploadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
