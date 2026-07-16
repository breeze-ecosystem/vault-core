import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";

type ScanState = "idle" | "scanning" | "success" | "error";

interface QrScannerProps {
  onCheckIn: (visitorToken: string) => void;
  onError?: (error: string) => void;
}

interface CheckInResult {
  visitorName?: string;
  hostName?: string;
  checkInTime?: string;
  accessLevel?: string;
  alreadyCheckedIn?: boolean;
}

export function QrScanner({ onCheckIn, onError }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [message, setMessage] = useState("Prêt à scanner");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanState !== "idle") return;

      setScanState("scanning");
      setMessage("Vérification du code...");

      try {
        // Delegate to parent for actual API call
        onCheckIn(data);
        setScanState("success");
        setMessage("Visitor check-in réussi");
      } catch (err: any) {
        setScanState("error");
        const msg = err.message || "QR code invalide";
        setErrorMessage(msg);
        onError?.(msg);
      }
    },
    [scanState, onCheckIn, onError]
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.heading}>Permission caméra</Text>
          <Text style={styles.bodyText}>
            Autorisez l'accès à la caméra pour scanner les QR codes.
          </Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.heading}>Caméra non autorisée</Text>
          <Text style={styles.bodyText}>
            L'accès à la caméra est requis pour le scan de QR codes.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>
              Autoriser la caméra
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (scanState === "success") {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Check-in confirmé</Text>
          {result?.visitorName && (
            <>
              <Text style={styles.visitorName}>{result.visitorName}</Text>
              {result.hostName && (
                <Text style={styles.hostText}>Hôte: {result.hostName}</Text>
              )}
              {result.checkInTime && (
                <Text style={styles.timeText}>
                  Heure: {result.checkInTime}
                </Text>
              )}
            </>
          )}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setScanState("idle");
              setResult(null);
              setMessage("Prêt à scanner");
            }}
          >
            <Text style={styles.resetButtonText}>Scanner un autre code</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (scanState === "error") {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <View style={styles.centerContent}>
          <View style={styles.errorIcon}>
            <Text style={styles.crossmark}>✕</Text>
          </View>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.bodyText}>
            {errorMessage || "QR code invalide ou déjà utilisé."}
          </Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setScanState("idle");
              setErrorMessage(null);
              setMessage("Prêt à scanner");
            }}
          >
            <Text style={styles.resetButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanState === "idle" ? handleBarCodeScanned : undefined}
      >
        <View style={styles.overlay}>
          {/* Scanning frame */}
          <View style={styles.scanFrame}>
            <View style={styles.scanFrameCornerTL} />
            <View style={styles.scanFrameCornerTR} />
            <View style={styles.scanFrameCornerBL} />
            <View style={styles.scanFrameCornerBR} />
          </View>
          <Text style={styles.scanHint}>
            Placez le QR code dans le cadre
          </Text>
        </View>
      </CameraView>
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
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  scanFrameCornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
  },
  scanFrameCornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.primary,
  },
  scanFrameCornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
  },
  scanFrameCornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.primary,
  },
  scanHint: {
    ...typography.body,
    color: "#ffffff",
    marginTop: spacing.xl,
    textAlign: "center",
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
  permissionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  permissionButtonText: {
    ...typography.body,
    color: "#ffffff",
    fontWeight: "600",
  },
  successContainer: {
    backgroundColor: "#052e16",
  },
  errorContainer: {
    backgroundColor: "#450a0a",
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
  visitorName: {
    ...typography.h3,
    color: colors.text,
  },
  hostText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  timeText: {
    ...typography.body,
    color: colors.textSecondary,
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
