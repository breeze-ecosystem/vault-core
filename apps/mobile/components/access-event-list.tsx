import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import FlashList from "@shopify/flash-list";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { type AccessEvent } from "@/lib/api";
import { Shield, ChevronRight, ImageIcon, AlertTriangle } from "lucide-react-native";

interface AccessEventListProps {
  events: AccessEvent[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEventPress: (event: AccessEvent) => void;
  ListHeaderComponent?: React.ReactElement;
}

const DECISION_COLORS: Record<string, string> = {
  AUTHORIZED: "#22c55e",
  DENIED: "#ef4444",
  FORCED: "#f59e0b",
  HELD_OPEN: "#f59e0b",
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function AccessEventList({
  events,
  loading,
  refreshing,
  onRefresh,
  onEventPress,
  ListHeaderComponent,
}: AccessEventListProps) {
  const renderEvent = useCallback(
    ({ item }: { item: AccessEvent }) => {
      const dotColor = DECISION_COLORS[item.decision] || colors.textMuted;
      const decisionLabel =
        item.decision === "AUTHORIZED"
          ? "Autorisé"
          : item.decision === "DENIED"
            ? "Refusé"
            : item.decision === "FORCED"
              ? "Forcé"
              : "Maintien";

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onEventPress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.decisionDot, { backgroundColor: dotColor }]} />
          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <Text style={[styles.decisionLabel, { color: dotColor }]}>
                {decisionLabel}
              </Text>
              <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
            </View>
            <Text style={styles.doorName}>{item.doorName}</Text>
            <Text style={styles.personName}>{item.personName || "Inconnu"}</Text>
            <View style={styles.cardMeta}>
              <View style={styles.credentialBadge}>
                <Text style={styles.credentialText}>{item.credentialType}</Text>
              </View>
              {item.snapshotUrl && (
                <View style={styles.snapshotThumb}>
                  <ImageIcon size={10} color={colors.textMuted} />
                  <Text style={styles.snapshotLabel}>Photo</Text>
                </View>
              )}
            </View>
          </View>
          <ChevronRight size={14} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [onEventPress],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlashList
      data={events}
      renderItem={renderEvent}
      estimatedItemSize={100}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.scroll}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Shield size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>Aucun événement d'accès</Text>
          <Text style={styles.emptyText}>
            Aucun événement d'accès pour la période sélectionnée.
          </Text>
        </View>
      }
      ListFooterComponent={() => <View style={{ height: 24 }} />}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    padding: spacing.md,
  },
  decisionDot: { width: 4, height: "100%", position: "absolute", left: 0, top: 0, bottom: 0 },
  cardContent: { flex: 1, paddingLeft: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  decisionLabel: { ...typography.label, fontSize: 11, fontWeight: "700" },
  timestamp: { ...typography.small },
  doorName: { ...typography.body, fontWeight: "600", marginBottom: 2 },
  personName: { ...typography.caption, marginBottom: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  credentialBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.primary + "20",
  },
  credentialText: { fontSize: 10, fontWeight: "600", color: colors.primary },
  snapshotThumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  snapshotLabel: { fontSize: 10, color: colors.textMuted },
  empty: { padding: spacing.xxl, alignItems: "center" },
  emptyTitle: { ...typography.heading, color: colors.textSecondary, marginTop: spacing.md },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm, lineHeight: 20, paddingHorizontal: spacing.xl },
});
