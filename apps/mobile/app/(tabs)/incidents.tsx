import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { AlertTriangle, Camera, Plus } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { PhotoCapture } from "@/components/photo-capture";
import { fetchMyIncidents, uploadIncidentPhoto } from "@/lib/api";
import type { MobileIncidentDto } from "@/lib/api";

type ScreenView = "list" | "capture";

export default function IncidentsScreen() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<MobileIncidentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ScreenView>("list");
  const [captureIncidentId, setCaptureIncidentId] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, string[]>>({});

  const loadIncidents = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const result = await fetchMyIncidents();
      setIncidents(result);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadIncidents();
    }, [loadIncidents])
  );

  const handlePhotoCapture = useCallback(
    (incidentId: string) => {
      setCaptureIncidentId(incidentId);
      setView("capture");
    },
    []
  );

  const handlePhotoCaptured = useCallback(
    async (photoUri: string) => {
      if (!captureIncidentId) return;

      try {
        await uploadIncidentPhoto(captureIncidentId, photoUri);
        setCapturedPhotos((prev) => ({
          ...prev,
          [captureIncidentId]: [
            ...(prev[captureIncidentId] || []),
            photoUri,
          ],
        }));
      } catch {
        // Store offline if upload fails
      }

      setCaptureIncidentId(null);
      setView("list");
    },
    [captureIncidentId]
  );

  const severityColor = (severity: string): string => {
    const map: Record<string, string> = {
      CRITICAL: "#dc2626",
      HIGH: "#f97316",
      MEDIUM: "#eab308",
      LOW: "#3b82f6",
      INFO: "#6b7280",
    };
    return map[severity] || colors.textMuted;
  };

  // Photo capture modal
  if (view === "capture") {
    return (
      <View style={styles.container}>
        <PhotoCapture
          onPhotoCaptured={handlePhotoCaptured}
          onError={(err) => {
            setCaptureIncidentId(null);
            setView("list");
          }}
        />
        <TouchableOpacity
          style={styles.cancelCaptureButton}
          onPress={() => {
            setCaptureIncidentId(null);
            setView("list");
          }}
        >
          <Text style={styles.cancelCaptureText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.title}>Incidents</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/incident/new")}
        >
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <Text style={styles.bodyText}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <AlertTriangle size={48} color={colors.textMuted} />
          <Text style={styles.heading}>Incidents</Text>
          <Text style={styles.bodyText}>{error}</Text>
        </View>
      ) : incidents.length === 0 ? (
        <View style={styles.centerContent}>
          <AlertTriangle size={48} color={colors.textMuted} />
          <Text style={styles.heading}>Incidents</Text>
          <Text style={styles.bodyText}>
            Aucun incident assigné pour le moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const hasPhotos = (capturedPhotos[item.id]?.length || 0) > 0;
            return (
              <TouchableOpacity
                style={styles.incidentCard}
                onPress={() => router.push(`/incident/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.incidentHeader}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: severityColor(item.severity) },
                    ]}
                  >
                    <Text style={styles.severityText}>
                      {item.severity.substring(0, 3)}
                    </Text>
                  </View>
                  <View style={styles.incidentInfo}>
                    <Text style={styles.incidentTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.incidentMeta}>
                      {item.zoneName || "Zone inconnue"} · {item.status}
                    </Text>
                  </View>
                  <Text style={styles.incidentTime}>
                    {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                  </Text>
                </View>

                {/* Action row */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handlePhotoCapture(item.id)}
                  >
                    <Camera size={14} color={colors.primary} />
                    <Text style={styles.photoButtonText}>
                      {hasPhotos
                        ? `${capturedPhotos[item.id].length} photo(s)`
                        : "Ajouter une photo"}
                    </Text>
                  </TouchableOpacity>
                  {hasPhotos && (
                    <View style={styles.photoPreviews}>
                      {capturedPhotos[item.id].map((uri, idx) => (
                        <Image
                          key={idx}
                          source={{ uri }}
                          style={styles.photoThumb}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  incidentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  incidentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  severityBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  severityText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  incidentInfo: {
    flex: 1,
  },
  incidentTitle: {
    ...typography.h3,
    color: colors.text,
  },
  incidentMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  incidentTime: {
    ...typography.small,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  photoButtonText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "600",
  },
  photoPreviews: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  photoThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelCaptureButton: {
    position: "absolute",
    bottom: spacing.xl,
    alignSelf: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cancelCaptureText: {
    ...typography.body,
    color: colors.textSecondary,
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
});
