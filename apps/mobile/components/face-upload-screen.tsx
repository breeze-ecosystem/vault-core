import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, Upload, X, CheckCircle, AlertCircle } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { addFace, getFaces, type FaceData } from "@/lib/api-extensions";

type UploadState = "idle" | "selecting" | "preview" | "uploading" | "success" | "error";

interface FaceUploadScreenProps {
  onFaceAdded: () => void;
  currentCount?: number;
  maxCount?: number;
}

export function FaceUploadScreen({
  onFaceAdded,
  currentCount = 0,
  maxCount = 50,
}: FaceUploadScreenProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>("");

  const limitReached = currentCount >= maxCount;

  const handleCameraCapture = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Autorisation requise",
          "L'autorisation d'accès à la caméra est nécessaire pour prendre une photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setUploadState("preview");
        setErrorMessage(null);
      }
    } catch (e: any) {
      setErrorMessage("Erreur lors de la capture");
      setUploadState("error");
    }
  }, []);

  const handleGalleryPick = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Autorisation requise",
          "L'autorisation d'accès à la galerie est nécessaire."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setUploadState("preview");
        setErrorMessage(null);
      }
    } catch (e: any) {
      setErrorMessage("Erreur lors de la sélection");
      setUploadState("error");
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!imageUri || !name.trim()) {
      setErrorMessage("Veuillez entrer un nom pour ce visage");
      return;
    }

    setUploadState("uploading");
    setProgressMessage("Ajout en cours...");

    try {
      await addFace({ name: name.trim(), imageUri });
      setUploadState("success");
      setProgressMessage("Visage ajouté avec succès");
      setTimeout(() => {
        onFaceAdded();
      }, 1500);
    } catch (e: any) {
      setUploadState("error");
      if (e.message?.includes("existe déjà")) {
        setErrorMessage("Ce visage existe déjà");
      } else {
        setErrorMessage(e.message || "Erreur lors de l'ajout du visage");
      }
    }
  }, [imageUri, name, onFaceAdded]);

  const handleReset = useCallback(() => {
    setImageUri(null);
    setName("");
    setUploadState("idle");
    setErrorMessage(null);
    setProgressMessage("");
  }, []);

  // Limit reached
  if (limitReached) {
    return (
      <View style={styles.centered}>
        <AlertCircle size={48} color={colors.warning} />
        <Text style={styles.limitTitle}>Limite de {maxCount} visages atteinte</Text>
        <Text style={styles.limitSubtitle}>
          Passez au pack BASTION pour débloquer la reconnaissance illimitée.
        </Text>
      </View>
    );
  }

  // Success
  if (uploadState === "success") {
    return (
      <View style={styles.centered}>
        <View style={[styles.successIcon, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
          <CheckCircle size={48} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Visage ajouté</Text>
        <Text style={styles.successSubtitle}>{name} a été ajouté à la liste blanche.</Text>
      </View>
    );
  }

  // Permission denied / error
  if (uploadState === "error") {
    return (
      <View style={styles.centered}>
        <AlertCircle size={48} color={colors.destructive} />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorSubtitle}>{errorMessage}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleReset}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Uploading
  if (uploadState === "uploading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.uploadingText}>{progressMessage}</Text>
      </View>
    );
  }

  // Preview state
  if (uploadState === "preview" && imageUri) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.counterBar}>
          <Text style={styles.counterText}>{currentCount}/{maxCount} visages</Text>
        </View>

        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />

        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>Nom du visage</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Entrez un nom"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.submitBtn, !name.trim() && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!name.trim()}
            >
              <Upload size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Ajouter ce visage</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleReset}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Idle / select state
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.counterBar}>
        <Text style={styles.counterText}>{currentCount}/{maxCount} visages</Text>
      </View>

      <View style={styles.optionsSection}>
        <TouchableOpacity style={styles.optionCard} onPress={handleCameraCapture}>
          <View style={[styles.optionIcon, { backgroundColor: "rgba(6,182,212,0.1)" }]}>
            <Camera size={32} color={colors.primary} />
          </View>
          <Text style={styles.optionTitle}>Prendre une photo</Text>
          <Text style={styles.optionDesc}>Utilisez l'appareil photo pour capturer un visage</Text>
        </TouchableOpacity>

        <View style={styles.orDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.optionCard} onPress={handleGalleryPick}>
          <View style={[styles.optionIcon, { backgroundColor: "rgba(16,185,129,0.1)" }]}>
            <ImageIcon size={32} color={colors.success} />
          </View>
          <Text style={styles.optionTitle}>Choisir dans la galerie</Text>
          <Text style={styles.optionDesc}>Sélectionnez une photo existante</Text>
        </TouchableOpacity>
      </View>

      {errorMessage && (
        <Text style={styles.errorBanner}>{errorMessage}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  counterBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  counterText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  optionsSection: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  optionDesc: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  orText: {
    ...typography.small,
    color: colors.textMuted,
  },
  previewImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#000",
  },
  formSection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  inputLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  formActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  uploadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    ...typography.heading,
    color: colors.success,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  errorTitle: {
    ...typography.heading,
    color: colors.destructive,
  },
  errorSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  limitTitle: {
    ...typography.heading,
    color: colors.text,
    textAlign: "center",
  },
  limitSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  errorBanner: {
    ...typography.body,
    color: colors.destructive,
    textAlign: "center",
    padding: spacing.md,
    backgroundColor: "rgba(239,68,68,0.1)",
    margin: spacing.lg,
    borderRadius: borderRadius.md,
  },
});
