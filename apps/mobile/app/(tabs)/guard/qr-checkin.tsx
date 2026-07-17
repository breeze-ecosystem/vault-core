import { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, typography, spacing } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { QrScanner } from "@/components/qr-scanner";
import { checkInVisitor } from "@/lib/api";

type CheckinState = "scanning" | "success" | "already_checked_in" | "error";

interface CheckInData {
  visitorName?: string;
  hostName?: string;
  checkInTime?: string;
  accessLevel?: string;
}

export default function QrCheckinScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [state, setState] = useState<CheckinState>("scanning");
  const [data, setData] = useState<CheckInData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckIn = useCallback(async (visitorToken: string) => {
    try {
      const result = await checkInVisitor(visitorToken);
      if (result.alreadyCheckedIn) {
        setData({
          visitorName: result.visitorName,
          hostName: result.hostName,
          checkInTime: result.checkInTime,
          accessLevel: result.accessLevel,
        });
        setState("already_checked_in");
      } else {
        setData({
          visitorName: result.visitorName,
          hostName: result.hostName,
          checkInTime: result.checkInTime,
          accessLevel: result.accessLevel,
        });
        setState("success");
      }
    } catch (err: any) {
      setErrorMessage(err.message || t("guard.invalidQr"));
      setState("error");
    }
  }, []);

  if (state === "success" && data) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.successTitle}>{t("guard.checkinConfirm")}</Text>
          {data.visitorName && (
            <Text style={styles.visitorName}>{data.visitorName}</Text>
          )}
          {data.hostName && (
            <Text style={styles.infoText}>{t("guard.host", { name: data.hostName })}</Text>
          )}
          {data.checkInTime && (
            <Text style={styles.infoText}>{t("guard.time", { time: data.checkInTime })}</Text>
          )}
          {data.accessLevel && (
            <Text style={styles.infoText}>
              {t("guard.accessLevel", { level: data.accessLevel })}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (state === "already_checked_in") {
    return (
      <View style={[styles.container, styles.warningContainer]}>
        <View style={styles.centerContent}>
          <View style={styles.warningIcon}>
            <Text style={styles.warningSymbol}>!</Text>
          </View>
          <Text style={styles.warningTitle}>{t("guard.alreadyCheckedIn")}</Text>
          {data?.visitorName && (
            <Text style={styles.visitorName}>{data.visitorName}</Text>
          )}
          {data?.checkInTime && (
            <Text style={styles.infoText}>
              {t("guard.previousCheckin", { time: data.checkInTime })}
            </Text>
          )}
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
          <Text style={styles.errorTitle}>{t("guard.error")}</Text>
          <Text style={styles.bodyText}>
            {errorMessage || t("guard.invalidQr")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <QrScanner onCheckIn={handleCheckIn} />
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
  warningContainer: {
    backgroundColor: "#1c1917",
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
    ...typography.h1,
    color: "#10b981",
    textAlign: "center",
  },
  visitorName: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  warningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  warningSymbol: {
    fontSize: 36,
    color: "#ffffff",
    fontWeight: "700",
  },
  warningTitle: {
    ...typography.h1,
    color: "#f59e0b",
    textAlign: "center",
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
