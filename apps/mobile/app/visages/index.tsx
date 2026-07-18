import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import FlashList from "@shopify/flash-list";
import { getBastionFaces, type BastionFaceEntry } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { Shield, UserPlus, AlertTriangle } from "lucide-react-native";

export default function VisagesScreen() {
  const router = useRouter();
  const [faces, setFaces] = useState<BastionFaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFaces = useCallback(async () => {
    try {
      setError(null);
      const result = await getBastionFaces({ limit: 100 });
      setFaces(result.data || []);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFaces(); }, [loadFaces]);

  const refresh = async () => {
    setRefreshing(true);
    await loadFaces();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View style={styles.headerRow}>
          <Shield size={20} color={colors.primary} />
          <Text style={styles.title}>Visages</Text>
        </View>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/visages/enroler")}
        >
          <UserPlus size={18} color="#fff" />
          <Text style={styles.fabText}>Ajouter un visage</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlashList
        data={faces}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.photoBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${item.photoBase64}` }}
                style={styles.faceImage}
              />
            ) : (
              <View style={styles.facePlaceholder}>
                <Shield size={24} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.faceName}>{item.name}</Text>
              {item.isBlacklisted && (
                <View style={styles.blacklistBadge}>
                  <AlertTriangle size={10} color="#fff" />
                  <Text style={styles.blacklistText}>Liste noire</Text>
                </View>
              )}
              <Text style={styles.faceDate}>
                Ajouté le {new Date(item.createdAt).toLocaleDateString("fr-FR")}
              </Text>
            </View>
          </View>
        )}
        estimatedItemSize={80}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={() => <View style={{ height: spacing.sm }} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Shield size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>Aucun visage enregistré</Text>
            <Text style={styles.emptyText}>
              Aucun visage dans la base. Enrôlez des visages pour activer la reconnaissance faciale
              illimitée.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/visages/enroler")}
            >
              <UserPlus size={16} color="#fff" />
              <Text style={styles.emptyButtonText}>Enrôler un visage</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={() => <View style={{ height: 24 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h2 },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  fabText: { ...typography.label, color: "#fff", fontSize: 12, fontWeight: "600" },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: borderRadius.md,
  },
  errorText: { ...typography.caption, color: colors.destructive, flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    padding: spacing.md,
    gap: spacing.md,
  },
  faceImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.border,
  },
  facePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1 },
  faceName: { ...typography.body, fontWeight: "600", marginBottom: 2 },
  blacklistBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.destructive,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  blacklistText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  faceDate: { ...typography.small, marginTop: 2 },
  empty: { padding: spacing.xxl, alignItems: "center" },
  emptyTitle: { ...typography.heading, color: colors.textSecondary, marginTop: spacing.md },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  emptyButtonText: { ...typography.body, fontWeight: "600", color: "#fff" },
});
