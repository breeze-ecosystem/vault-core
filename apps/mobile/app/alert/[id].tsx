import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  fetchAlertById,
  acknowledgeAlert,
  resolveAlert,
  markAlertFalsePositive,
  deleteAlert,
  type AlertDetail,
} from "@/lib/api";
import {
  severityColors,
  alertStatusColors,
  alertStatusLabels,
} from "@/lib/constants";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAlert = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAlertById(id);
      setAlert(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAlert();
  }, [loadAlert]);

  async function handleAcknowledge() {
    if (!alert) return;
    try {
      setActionLoading("ack");
      const updated = await acknowledgeAlert(alert.id);
      setAlert(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossible de prendre en compte l'alerte";
      Alert.alert("Erreur", msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolve() {
    if (!alert) return;
    try {
      setActionLoading("resolve");
      const updated = await resolveAlert(alert.id);
      setAlert(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossible de resoudre l'alerte";
      Alert.alert("Erreur", msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFalsePositive() {
    if (!alert) return;
    try {
      setActionLoading("fp");
      const updated = await markAlertFalsePositive(alert.id);
      setAlert(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossible de marquer comme faux positif";
      Alert.alert("Erreur", msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!alert) return;
    Alert.alert(
      "Supprimer l'alerte",
      "Êtes-vous sûr de vouloir supprimer cette alerte ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading("delete");
              await deleteAlert(alert.id);
              router.back();
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Impossible de supprimer l'alerte";
              Alert.alert("Erreur", msg);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Alerte" }} />
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error || !alert) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Alerte" }} />
        <Text style={styles.errorText}>{error || "Alerte introuvable"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadAlert}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sevColor = severityColors[alert.severity] ?? "#6b7280";
  const statColor = alertStatusColors[alert.status] ?? "#888";
  const canAcknowledge = alert.status === "OPEN";
  const canResolve = alert.status === "OPEN" || alert.status === "ACKNOWLEDGED";
  const canMarkFP = alert.status === "OPEN" || alert.status === "ACKNOWLEDGED";
  const canDelete = alert.status !== "RESOLVED" && alert.status !== "FALSE_POSITIVE";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Détail de l'alerte",
          headerBackTitle: "Retour",
        }}
      />
      <ScrollView style={styles.container}>
        {/* Header section */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={[styles.severityBadge, { backgroundColor: sevColor }]}>
              <Text style={styles.severityBadgeText}>{alert.severity}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statColor}22`, borderColor: statColor }]}>
              <Text style={[styles.statusBadgeText, { color: statColor }]}>
                {alertStatusLabels[alert.status] ?? alert.status}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.date}>Créée le {formatDate(alert.createdAt)}</Text>
        </View>

        {/* Snapshot image */}
        {alert.snapshotUrl ? (
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>Image associée</Text>
            <Image
              source={{ uri: alert.snapshotUrl }}
              style={styles.snapshotImage}
              resizeMode="cover"
              accessibilityLabel="Image de l'alerte"
            />
          </View>
        ) : null}

        {/* Description */}
        {alert.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{alert.description}</Text>
          </View>
        ) : null}

        {/* Details card */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Détails</Text>
          <View style={styles.detailsCard}>
            <DetailRow label="Sévérité" value={alert.severity} valueColor={sevColor} />
            <DetailRow label="Statut" value={alertStatusLabels[alert.status] ?? alert.status} valueColor={statColor} />
            <DetailRow label="Caméra" value={alert.camera?.name ?? "Inconnue"} />
            <DetailRow label="Créée le" value={formatDate(alert.createdAt)} />
            <DetailRow label="Dernière màj" value={formatDate(alert.updatedAt)} />
            {alert.acknowledgedAt && (
              <DetailRow label="Prise en compte le" value={formatDate(alert.acknowledgedAt)} />
            )}
            {alert.resolvedAt && (
              <DetailRow label="Résolue le" value={formatDate(alert.resolvedAt)} />
            )}
          </View>
        </View>

        {/* Camera link */}
        {alert.camera && (
          <TouchableOpacity
            style={styles.cameraLink}
            onPress={() => router.push(`/camera/${alert.camera?.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cameraLinkContent}>
              <Text style={styles.cameraLinkIcon}>📹</Text>
              <View style={styles.cameraLinkText}>
                <Text style={styles.cameraLinkTitle}>{alert.camera.name}</Text>
                <Text style={styles.cameraLinkSub}>Voir la caméra</Text>
              </View>
              <Text style={styles.cameraLinkArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Actions */}
        {(canAcknowledge || canResolve || canMarkFP) && (
          <View style={styles.actionsSection}>
            {canAcknowledge && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.ackBtn, actionLoading === "ack" && styles.actionBtnDisabled]}
                onPress={handleAcknowledge}
                disabled={actionLoading !== null}
                activeOpacity={0.7}
              >
                {actionLoading === "ack" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Prendre en compte</Text>
                )}
              </TouchableOpacity>
            )}
            {canResolve && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.resolveBtn, actionLoading === "resolve" && styles.actionBtnDisabled]}
                onPress={handleResolve}
                disabled={actionLoading !== null}
                activeOpacity={0.7}
              >
                {actionLoading === "resolve" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Résoudre</Text>
                )}
              </TouchableOpacity>
            )}
            {canMarkFP && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.fpBtn, actionLoading === "fp" && styles.actionBtnDisabled]}
                onPress={handleFalsePositive}
                disabled={actionLoading !== null}
                activeOpacity={0.7}
              >
                {actionLoading === "fp" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Faux positif</Text>
                )}
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn, actionLoading === "delete" && styles.actionBtnDisabled]}
                onPress={handleDelete}
                disabled={actionLoading !== null}
                activeOpacity={0.7}
              >
                {actionLoading === "delete" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Supprimer</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  label: {
    fontSize: 13,
    color: "#888",
  },
  value: {
    fontSize: 13,
    color: "#ededed",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    padding: 20,
  },
  loadingText: {
    color: "#888",
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#2563eb",
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ededed",
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: "#888",
  },
  imageSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  snapshotImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  descriptionText: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 14,
  },
  cameraLink: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  cameraLinkContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  cameraLinkIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cameraLinkText: {
    flex: 1,
  },
  cameraLinkTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ededed",
  },
  cameraLinkSub: {
    fontSize: 12,
    color: "#2563eb",
    marginTop: 2,
  },
  cameraLinkArrow: {
    fontSize: 22,
    color: "#555",
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ackBtn: {
    backgroundColor: "#2563eb",
  },
  resolveBtn: {
    backgroundColor: "#16a34a",
  },
  fpBtn: {
    backgroundColor: "#6b7280",
  },
  deleteBtn: {
    backgroundColor: "#dc2626",
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 40,
  },
});
