import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import { Shield, ShieldCheck, ShieldOff, AlertTriangle } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { forceArm, forceDisarm } from "@/lib/api-extensions";

interface ArmDisarmToggleProps {
  armed: boolean;
  onToggle: () => void;
  disabled?: boolean;
  countdownMinutes?: number | null;
}

export function ArmDisarmToggle({
  armed,
  onToggle,
  disabled = false,
  countdownMinutes = null,
}: ArmDisarmToggleProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = useCallback(() => {
    if (disabled) return;
    setShowConfirm(true);
  }, [disabled]);

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false);
    setIsLoading(true);

    try {
      if (armed) {
        await forceDisarm();
      } else {
        await forceArm();
      }
      onToggle();
    } catch (e) {
      // Error handled silently - parent should retry
    } finally {
      setIsLoading(false);
    }
  }, [armed, onToggle]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  // Animate on armed state change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [armed, scaleAnim]);

  const containerSize = 72;
  const iconSize = 32;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || isLoading}
        activeOpacity={0.8}
        accessibilityLabel={armed ? "Désarmer le système" : "Armer le système"}
        accessibilityRole="switch"
        accessibilityState={{ checked: armed }}
      >
        <Animated.View
          style={[
            styles.button,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              backgroundColor: armed ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
              borderColor: armed ? colors.destructive : colors.success,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {armed ? (
            <ShieldOff size={iconSize} color={colors.destructive} />
          ) : (
            <ShieldCheck size={iconSize} color={colors.success} />
          )}
        </Animated.View>
      </TouchableOpacity>

      <Text style={[styles.statusText, { color: armed ? colors.destructive : colors.success }]}>
        {armed ? "Armé" : "Désarmé"}
      </Text>

      {countdownMinutes != null && countdownMinutes > 0 && armed && (
        <Text style={styles.countdownText}>
          Armement dans {countdownMinutes} min
        </Text>
      )}

      {/* Confirmation dialog */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCancel}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <View style={[styles.dialogIcon, { borderColor: armed ? colors.destructive : colors.success }]}>
              <AlertTriangle size={28} color={armed ? colors.destructive : colors.success} />
            </View>
            <Text style={styles.dialogTitle}>
              {armed ? "Désarmer le système ?" : "Armer le système ?"}
            </Text>
            <Text style={styles.dialogDesc}>
              {armed
                ? "Le système reviendra en mode normal. Les alertes seront envoyées normalement."
                : "Le mode absence sera activé. Vous recevrez une notification lorsque le système sera armé."}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelDialogBtn}
                onPress={handleCancel}
              >
                <Text style={styles.cancelDialogText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmDialogBtn,
                  { backgroundColor: armed ? colors.destructive : colors.success },
                ]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmDialogText}>
                  {armed ? "Désarmer" : "Armer"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: spacing.sm,
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  statusText: {
    ...typography.body,
    fontWeight: "700",
    fontSize: 15,
  },
  countdownText: {
    ...typography.small,
    color: colors.warning,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: spacing.md,
  },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogTitle: {
    ...typography.heading,
    color: colors.text,
    textAlign: "center",
  },
  dialogDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
    width: "100%",
  },
  cancelDialogBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelDialogText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  confirmDialogBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  confirmDialogText: {
    ...typography.body,
    color: "#fff",
    fontWeight: "600",
  },
});
