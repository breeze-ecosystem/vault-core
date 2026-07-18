import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { type AccessEvent } from "@/lib/api";
import { X, Play, Clock, MapPin, Shield } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CorrelatedSnapshotViewerProps {
  visible: boolean;
  snapshotUrl: string | null;
  videoClipUrl?: string | null;
  event: AccessEvent | null;
  onClose: () => void;
}

const DECISION_LABELS: Record<string, { label: string; color: string }> = {
  AUTHORIZED: { label: "Autorisé", color: "#22c55e" },
  DENIED: { label: "Refusé", color: "#ef4444" },
  FORCED: { label: "Forcé", color: "#f59e0b" },
  HELD_OPEN: { label: "Maintien", color: "#f59e0b" },
};

export function CorrelatedSnapshotViewer({
  visible,
  snapshotUrl,
  videoClipUrl,
  event,
  onClose,
}: CorrelatedSnapshotViewerProps) {
  const [videoLoading, setVideoLoading] = useState(false);

  const handlePlayVideo = useCallback(() => {
    if (!videoClipUrl) return;
    setVideoLoading(true);
    // Video playback would use expo-av Video component
    // For now, show the loading state as the component renders the clip URL
    setTimeout(() => setVideoLoading(false), 3000);
  }, [videoClipUrl]);

  if (!event) return null;

  const decision = DECISION_LABELS[event.decision] || { label: event.decision, color: colors.textMuted };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Événement d'accès</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView style={styles.body} bounces={false}>
          {/* Snapshot Image */}
          <View style={styles.imageContainer}>
            {snapshotUrl ? (
              <Image
                source={{ uri: snapshotUrl }}
                style={styles.snapshotImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.noImage}>
                <Shield size={48} color={colors.textMuted} />
                <Text style={styles.noImageText}>Aucune photo disponible</Text>
              </View>
            )}

            {/* Video clip button */}
            {videoClipUrl && (
              <TouchableOpacity style={styles.videoButton} onPress={handlePlayVideo}>
                {videoLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Play size={20} color="#fff" fill="#fff" />
                    <Text style={styles.videoButtonText}>Voir la vidéo 10s</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Event Details */}
          <View style={styles.details}>
            <View style={styles.decisionRow}>
              <View style={[styles.decisionBadge, { backgroundColor: decision.color + "20" }]}>
                <Text style={[styles.decisionText, { color: decision.color }]}>
                  {decision.label}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{event.doorName}</Text>
            </View>

            <View style={styles.metaRow}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {new Date(event.timestamp).toLocaleString("fr-FR")}
              </Text>
            </View>

            {event.personName && (
              <View style={styles.personSection}>
                <Text style={styles.personLabel}>Personne</Text>
                <Text style={styles.personName}>{event.personName}</Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <Shield size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>
                Type: {event.credentialType}
              </Text>
            </View>

            {event.metadata && (
              <View style={styles.metadataSection}>
                <Text style={styles.metadataTitle}>Métadonnées</Text>
                {Object.entries(event.metadata).map(([key, val]) => (
                  <View key={key} style={styles.metadataRow}>
                    <Text style={styles.metadataKey}>{key}</Text>
                    <Text style={styles.metadataVal}>{String(val)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: { width: 40, alignItems: "center" },
  headerTitle: { ...typography.heading, color: "#fff" },
  body: { flex: 1 },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  snapshotImage: {
    width: "100%",
    height: "100%",
  },
  noImage: {
    alignItems: "center",
    gap: spacing.sm,
  },
  noImageText: {
    ...typography.body,
    color: colors.textMuted,
  },
  videoButton: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  videoButtonText: {
    ...typography.caption,
    fontWeight: "600",
    color: "#fff",
  },
  details: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  decisionRow: {
    flexDirection: "row",
  },
  decisionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  decisionText: {
    ...typography.label,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  personSection: {
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  personLabel: {
    ...typography.label,
    marginBottom: 4,
  },
  personName: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
  },
  metadataSection: {
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  metadataTitle: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  metadataKey: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  metadataVal: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    textAlign: "right",
  },
});
