import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Vibration,
  Animated,
  Easing,
  StyleSheet,
  Platform,
} from "react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { validateBadge } from "@/lib/api";
import { NfcTech } from "react-native-nfc-manager";

// We use a dynamic import pattern so the app won't crash on devices without NFC
let NfcManager: any = null;

async function initNfcManager() {
  try {
    const mod = await import("react-native-nfc-manager");
    NfcManager = mod.default;
    await NfcManager.start();
    return true;
  } catch {
    return false;
  }
}

type NfcState =
  | "initializing"
  | "idle"
  | "scanning"
  | "success"
  | "error"
  | "unsupported";

interface NfcScannerProps {
  onBadgeScanned: (badgeId: string) => void;
  onError?: (error: string) => void;
}

export function NfcScanner({ onBadgeScanned, onError }: NfcScannerProps) {
  const [state, setState] = useState<NfcState>("initializing");
  const [message, setMessage] = useState("Initialisation NFC...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [badgeResult, setBadgeResult] = useState<{
    name?: string;
    accessLevel?: string;
    granted?: boolean;
  } | null>(null);
  const [nfcAvailable, setNfcAvailable] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulse animation for scanning state
  useEffect(() => {
    if (state === "scanning") {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [state, pulseAnim]);

  const initNfc = useCallback(async () => {
    setState("initializing");
    setMessage("Initialisation NFC...");

    const available = await initNfcManager();
    if (!available) {
      setState("unsupported");
      setMessage("NFC non disponible");
      return;
    }

    setNfcAvailable(true);
    setState("idle");
    setMessage("Approchez un badge");
  }, []);

  useEffect(() => {
    initNfc();
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (NfcManager) {
        try {
          NfcManager.cancelTechnologyRequest();
        } catch {}
      }
    };
  }, [initNfc]);

  const startScan = useCallback(async () => {
    if (!NfcManager || !nfcAvailable) {
      setState("unsupported");
      return;
    }

    try {
      setState("scanning");
      setMessage("Scannez un badge...");
      setErrorMessage(null);

      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.NfcA, {
        alertMessage: "Approchez un badge NFC",
      });

      // Read tag
      const tag = await NfcManager.getTag();
      const tagId = tag?.id;

      if (!tagId) {
        throw new Error("Impossible de lire le badge");
      }

      // Cancel technology after reading
      await NfcManager.cancelTechnologyRequest();

      // Vibration feedback
      Vibration.vibrate(100);

      // Validate badge against server
      setMessage("Validation du badge...");
      const result = await validateBadge(tagId);

      if (result.valid) {
        setBadgeResult({
          name: result.userName,
          accessLevel: result.accessLevel,
          granted: true,
        });
        setState("success");
        setMessage("Badge valide !");
        Vibration.vibrate([0, 100, 50, 100]); // Success haptic pattern
        onBadgeScanned(tagId);
      } else {
        setBadgeResult({
          granted: false,
        });
        setState("error");
        setMessage("Badge refusé");
        Vibration.vibrate([0, 200, 100, 200, 100, 200]); // Error haptic pattern
      }
    } catch (err: any) {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      setState("error");
      const msg = err.message || "Erreur de lecture NFC";
      setErrorMessage(msg);
      setMessage("Erreur de lecture");
      onError?.(msg);
    }
  }, [nfcAvailable, onBadgeScanned, onError]);

  const reset = useCallback(() => {
    setState("idle");
    setMessage("Approchez un badge");
    setErrorMessage(null);
    setBadgeResult(null);
  }, []);

  // ---- Render states ----
  if (state === "initializing") {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.statusText}>{message}</Text>
        </View>
      </View>
    );
  }

  if (state === "unsupported") {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.iconText}>📡</Text>
          <Text style={styles.heading}>NFC non disponible</Text>
          <Text style={styles.bodyText}>
            Cet appareil ne prend pas en charge la technologie NFC. Utilisez le
            scan QR comme alternative.
          </Text>
        </View>
      </View>
    );
  }

  if (state === "success" && badgeResult) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Badge valide</Text>
          {badgeResult.name && (
            <Text style={styles.userName}>{badgeResult.name}</Text>
          )}
          {badgeResult.accessLevel && (
            <Text style={styles.accessLevel}>
              Niveau: {badgeResult.accessLevel}
            </Text>
          )}
          <Text style={styles.grantedText}>Accès autorisé</Text>
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>Scanner un autre badge</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state === "error") {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <View style={styles.centerContent}>
          <View style={styles.errorIcon}>
            <Text style={styles.crossmark}>✕</Text>
          </View>
          {badgeResult?.granted === false ? (
            <>
              <Text style={styles.errorTitle}>Badge refusé</Text>
              <Text style={styles.bodyText}>
                Ce badge n'est pas autorisé. Vérifiez les autorisations.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.errorTitle}>Erreur de lecture</Text>
              <Text style={styles.bodyText}>
                {errorMessage || "Impossible de lire le badge NFC."}
              </Text>
            </>
          )}
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Idle or scanning
  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        {state === "scanning" ? (
          <Animated.View
            style={[
              styles.scanRing,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.scanInnerRing}>
              <Text style={styles.nfcIcon}>📡</Text>
            </View>
          </Animated.View>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={startScan}>
            <Text style={styles.nfcIcon}>📡</Text>
            <Text style={styles.startButtonText}>Commencer le scan</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.statusText}>{message}</Text>
      </View>
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
  successContainer: {
    backgroundColor: "#052e16",
  },
  errorContainer: {
    backgroundColor: "#450a0a",
  },
  iconText: {
    fontSize: 48,
  },
  heading: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  nfcIcon: {
    fontSize: 40,
    textAlign: "center",
  },
  scanRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  scanInnerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  startButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  startButtonText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  checkmark: {
    fontSize: 36,
    color: "#ffffff",
    fontWeight: "700",
  },
  successTitle: {
    ...typography.h2,
    color: "#10b981",
  },
  userName: {
    ...typography.h3,
    color: colors.text,
  },
  accessLevel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  grantedText: {
    ...typography.body,
    color: "#10b981",
    fontWeight: "600",
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  crossmark: {
    fontSize: 36,
    color: "#ffffff",
    fontWeight: "700",
  },
  errorTitle: {
    ...typography.h2,
    color: "#ef4444",
  },
  resetButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resetButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
});
