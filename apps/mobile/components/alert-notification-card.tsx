import { memo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle, CheckCircle, Eye, Camera, ChevronRight } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { severityColors } from "@/lib/constants";
import type { AlertItem } from "@/lib/api";
import { acknowledgeAlert } from "@/lib/api-extensions";

interface AlertNotificationCardProps {
  alert: AlertItem;
  onAcknowledge?: (alertId: string) => void;
  onViewStream?: (cameraId: string) => void;
}

const SWIPE_THRESHOLD = 80;

export const AlertNotificationCard = memo(function AlertNotificationCard({
  alert,
  onAcknowledge,
  onViewStream,
}: AlertNotificationCardProps) {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;
  const acknowledgesRef = useRef(false);
  const viewsStreamRef = useRef(false);

  const color = severityColors[alert.severity] ?? colors.textMuted;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        const clamped = Math.min(Math.max(gestureState.dx, -SWIPE_THRESHOLD * 2), SWIPE_THRESHOLD * 2);
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left → acknowledge
          acknowledgesRef.current = true;
          Animated.timing(translateX, {
            toValue: -SWIPE_THRESHOLD,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (onAcknowledge) {
              onAcknowledge(alert.id);
            } else {
              acknowledgeAlert(alert.id).catch(() => {});
            }
          });
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right → view stream
          viewsStreamRef.current = true;
          Animated.timing(translateX, {
            toValue: SWIPE_THRESHOLD,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (onViewStream && alert.cameraId) {
              onViewStream(alert.cameraId);
            } else if (alert.cameraId) {
              router.push(`/camera/${alert.cameraId}`);
            }
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    router.push(`/alert/${alert.id}`);
  }, [router, alert.id]);

  return (
    <View style={styles.wrapper}>
      {/* Swipe indicators */}
      <View style={styles.swipeHintLeft}>
        <CheckCircle size={18} color="#fff" />
        <Text style={styles.swipeHintText}>Prendre en compte</Text>
      </View>
      <View style={styles.swipeHintRight}>
        <Eye size={18} color="#fff" />
        <Text style={styles.swipeHintText}>Voir le flux</Text>
      </View>

      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: color }]}>
              <AlertTriangle size={16} color="#fff" />
            </View>
            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={2}>{alert.title}</Text>
              <Text style={styles.camera}>
                {alert.camera?.name ?? "Caméra inconnue"}
              </Text>
              <Text style={styles.time}>
                {new Date(alert.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </Text>
            </View>
            {alert.cameraId && (
              <View style={styles.actionIcons}>
                <TouchableOpacity
                  onPress={() => {
                    if (onViewStream) onViewStream(alert.cameraId!);
                    else router.push(`/camera/${alert.cameraId}`);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Eye size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginBottom: spacing.md,
  },
  swipeHintLeft: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD,
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    zIndex: -1,
  },
  swipeHintRight: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    zIndex: -1,
  },
  swipeHintText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: "500",
  },
  camera: {
    ...typography.small,
    marginTop: 2,
  },
  time: {
    ...typography.small,
    fontSize: 10,
    marginTop: 2,
    color: colors.textMuted,
  },
  actionIcons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
