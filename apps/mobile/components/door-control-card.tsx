import { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { controlDoor } from "@/lib/api";
import {
  Lock,
  Unlock,
  DoorOpen,
  DoorClosed,
  Loader,
} from "lucide-react-native";

interface DoorControlCardProps {
  doorId: string;
  doorName: string;
  currentState: string;
  onStateChange?: (doorId: string, newState: string) => void;
  onError?: (error: string) => void;
}

function useStateConfig() {
  const { t } = useTranslation();
  return {
    open: {
      label: t("guard.doorState.open"),
      color: "#10b981",
      icon: <DoorOpen size={20} color="#10b981" />,
    },
    closed: {
      label: t("guard.doorState.closed"),
      color: "#f59e0b",
      icon: <DoorClosed size={20} color="#f59e0b" />,
    },
    locked: {
      label: t("guard.doorState.locked"),
      color: "#ef4444",
      icon: <Lock size={20} color="#ef4444" />,
    },
  } as Record<string, { label: string; color: string; icon: React.ReactNode }>;
}

export const DoorControlCard = memo(function DoorControlCard({
  doorId,
  doorName,
  currentState,
  onStateChange,
  onError,
}: DoorControlCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);
  const stateConfig = useStateConfig();

  const config = stateConfig[currentState] || stateConfig.closed;

  const handleAction = useCallback(
    (action: "open" | "close" | "lock") => {
      // Show confirmation for critical actions
      if (action === "lock" || action === "close") {
        Alert.alert(
          t("guard.confirmAction"),
          action === "lock"
            ? t("guard.confirmLock", { name: doorName })
            : t("guard.confirmClose", { name: doorName }),
          [
            { text: t("guard.cancel"), style: "cancel" },
            {
              text: t("guard.confirm"),
              style: action === "lock" ? "destructive" : "default",
              onPress: () => executeAction(action),
            },
          ]
        );
      } else {
        executeAction(action);
      }
    },
    [doorId, doorName]
  );

  const executeAction = useCallback(
    async (action: string) => {
      setLoading(action);
      try {
        await controlDoor(doorId, action);
        onStateChange?.(doorId, action === "unlock" ? "open" : action);
      } catch (err: any) {
        const msg = err.message || t("guard.controlError");
        onError?.(msg);
      } finally {
        setLoading(null);
      }
    },
    [doorId, onStateChange, onError]
  );

  return (
    <View style={styles.card}>
      {/* Door info */}
      <View style={styles.header}>
        <View style={styles.stateIndicator}>
          {config.icon}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.doorName} numberOfLines={1}>
            {doorName}
          </Text>
          <View style={styles.stateRow}>
            <View style={[styles.stateDot, { backgroundColor: config.color }]} />
            <Text style={[styles.stateLabel, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.openButton]}
          onPress={() => handleAction("open")}
          disabled={loading !== null}
          activeOpacity={0.7}
        >
          {loading === "open" ? (
            <Text style={styles.actionButtonLoading}>...</Text>
          ) : (
            <>
              <Unlock size={16} color="#10b981" />
              <Text style={[styles.actionLabel, { color: "#10b981" }]}>
                {t("guard.open")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.closeButton]}
          onPress={() => handleAction("close")}
          disabled={loading !== null}
          activeOpacity={0.7}
        >
          {loading === "close" ? (
            <Text style={styles.actionButtonLoading}>...</Text>
          ) : (
            <>
              <DoorClosed size={16} color="#f59e0b" />
              <Text style={[styles.actionLabel, { color: "#f59e0b" }]}>
                {t("guard.close")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.lockButton]}
          onPress={() => handleAction("lock")}
          disabled={loading !== null}
          activeOpacity={0.7}
        >
          {loading === "lock" ? (
            <Text style={styles.actionButtonLoading}>...</Text>
          ) : (
            <>
              <Lock size={16} color="#ef4444" />
              <Text style={[styles.actionLabel, { color: "#ef4444" }]}>
                {t("guard.lock")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stateIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.elevated,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  doorName: {
    ...typography.h3,
    color: colors.text,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stateLabel: {
    ...typography.caption,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  openButton: {
    borderColor: "#10b98130",
    backgroundColor: "#10b98110",
  },
  closeButton: {
    borderColor: "#f59e0b30",
    backgroundColor: "#f59e0b10",
  },
  lockButton: {
    borderColor: "#ef444430",
    backgroundColor: "#ef444410",
  },
  actionLabel: {
    ...typography.caption,
    fontWeight: "600",
  },
  actionButtonLoading: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
