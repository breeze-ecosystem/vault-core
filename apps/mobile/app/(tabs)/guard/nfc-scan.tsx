import { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, typography, spacing } from "@/lib/theme";
import { NfcScanner } from "@/components/nfc-scanner";
import { validateBadge } from "@/lib/api";

type ValidationState = "scanning" | "validating" | "valid" | "denied" | "error";

interface ValidationResult {
  userName?: string;
  accessLevel?: string;
  reason?: string;
}

export default function NfcScanScreen() {
  const router = useRouter();
  const [validationState, setValidationState] = useState<ValidationState>("scanning");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBadgeScanned = useCallback(async (badgeId: string) => {
    setValidationState("validating");
    try {
      const res = await validateBadge(badgeId);
      if (res.valid) {
        setResult({ userName: res.userName, accessLevel: res.accessLevel });
        setValidationState("valid");
      } else {
        setResult({ reason: res.reason });
        setValidationState("denied");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de validation");
      setValidationState("error");
    }
  }, []);

  const handleError = useCallback((error: string) => {
    setErrorMessage(error);
    setValidationState("error");
  }, []);

  if (validationState === "valid" && result) {
    return (
      <View style={[styles.container, styles.validContainer]}>
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Accès autorisé</Text>
          {result.userName && (
            <Text style={styles.userName}>{result.userName}</Text>
          )}
          {result.accessLevel && (
            <Text style={styles.accessLevel}>
              Niveau d'accès: {result.accessLevel}
            </Text>
          )}
          <Text style={styles.grantedText}>Badge valide</Text>
        </View>
      </View>
    );
  }

  if (validationState === "denied") {
    return (
      <View style={[styles.container, styles.deniedContainer]}>
        <View style={styles.centerContent}>
          <View style={styles.deniedIcon}>
            <Text style={styles.crossmark}>✕</Text>
          </View>
          <Text style={styles.deniedTitle}>Accès refusé</Text>
          {result?.reason && (
            <Text style={styles.bodyText}>{result.reason}</Text>
          )}
        </View>
      </View>
    );
  }

  if (validationState === "error") {
    return (
      <View style={[styles.container, styles.errorOuter]}>
        <View style={styles.centerContent}>
          <View style={styles.deniedIcon}>
            <Text style={styles.crossmark}>✕</Text>
          </View>
          <Text style={styles.deniedTitle}>Erreur</Text>
          <Text style={styles.bodyText}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NfcScanner onBadgeScanned={handleBadgeScanned} onError={handleError} />
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
  validContainer: {
    backgroundColor: "#052e16",
  },
  deniedContainer: {
    backgroundColor: "#450a0a",
  },
  errorOuter: {
    backgroundColor: "#1c1917",
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
    ...typography.h1,
    color: "#10b981",
    textAlign: "center",
  },
  userName: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  accessLevel: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  grantedText: {
    ...typography.body,
    color: "#10b981",
    fontWeight: "600",
    textAlign: "center",
  },
  deniedIcon: {
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
  deniedTitle: {
    ...typography.h1,
    color: "#ef4444",
    textAlign: "center",
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
