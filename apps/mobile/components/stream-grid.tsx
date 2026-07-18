import { memo, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Camera, WifiOff } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { statusColors, statusLabels } from "@/lib/constants";
import type { CameraItem } from "@/lib/api";

interface StreamGridProps {
  cameras: CameraItem[];
  onCameraPress: (id: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 8;
const CARD_PADDING = 16;
const NUM_COLUMNS = 2;
const CARD_WIDTH =
  (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 0.6;

function StreamCard({
  camera,
  onPress,
}: {
  camera: CameraItem;
  onPress: (id: string) => void;
}) {
  const statusColor = statusColors[camera.status] ?? colors.textMuted;
  const statusLabel = statusLabels[camera.status] ?? camera.status;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(camera.id)}
      activeOpacity={0.7}
    >
      {/* Thumbnail placeholder */}
      <View style={[styles.thumbnail, { backgroundColor: colors.surface }]}>
        {camera.status === "ONLINE" ? (
          <Camera size={28} color="rgba(255,255,255,0.3)" />
        ) : (
          <WifiOff size={28} color={colors.destructive} />
        )}
      </View>

      {/* Status dot overlay */}
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />

      {/* Recording indicator */}
      {camera.isRecording && <View style={styles.recordingIndicator} />}

      {/* Camera name overlay */}
      <View style={styles.cardFooter}>
        <Text style={styles.cardName} numberOfLines={1}>
          {camera.name}
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.smallDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const MemoizedStreamCard = memo(StreamCard);

export function StreamGrid({
  cameras,
  onCameraPress,
  refreshing,
  onRefresh,
}: StreamGridProps) {
  const handlePress = useCallback(
    (id: string) => onCameraPress(id),
    [onCameraPress],
  );

  const renderItem = useCallback(
    ({ item }: { item: CameraItem }) => (
      <MemoizedStreamCard camera={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const keyExtractor = useCallback((item: CameraItem) => item.id, []);

  const emptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Camera size={48} color={colors.border} />
        <Text style={styles.emptyTitle}>Aucune caméra configurée</Text>
        <Text style={styles.emptySubtitle}>
          Ajoutez des caméras depuis le tableau de bord
        </Text>
      </View>
    ),
    [],
  );

  return (
    <FlashList
      data={cameras}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.grid}
      ListEmptyComponent={emptyComponent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    padding: CARD_PADDING,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: CARD_GAP,
    position: "relative",
  },
  thumbnail: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusDot: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  recordingIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },
  cardFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  cardName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  smallDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
