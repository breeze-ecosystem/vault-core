import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Volume2, VolumeX, WifiOff, Clock, User } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { getShareTokenInfo, type ShareTokenInfo } from "@/lib/api-extensions";

type ReceiverState = "loading" | "connected" | "expired" | "invalid";

interface ShareLinkReceiverProps {
  token: string;
}

export function ShareLinkReceiver({ token }: ShareLinkReceiverProps) {
  const [state, setState] = useState<ReceiverState>("loading");
  const [shareInfo, setShareInfo] = useState<ShareTokenInfo | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const videoRef = useRef<Video>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadShare() {
      try {
        const info = await getShareTokenInfo(token);
        if (cancelled) return;

        if (!info.valid) {
          setState("invalid");
          return;
        }

        setShareInfo(info);
        setState("connected");

        // Start countdown timer
        const expiresAt = new Date(info.expiresAt).getTime();
        const updateTimer = () => {
          const now = Date.now();
          const diff = expiresAt - now;

          if (diff <= 0) {
            setState("expired");
            setTimeRemaining("Accès expiré");
            if (timerRef.current) clearInterval(timerRef.current);
            return;
          }

          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

          if (hours > 0) {
            setTimeRemaining(`Accès expirera dans ${hours}h ${minutes}min`);
          } else {
            setTimeRemaining(`Accès expirera dans ${minutes}min`);
          }
        };

        updateTimer();
        timerRef.current = setInterval(updateTimer, 60000); // Update every minute
      } catch {
        if (!cancelled) setState("invalid");
      }
    }

    loadShare();

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [token]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Loading state
  if (state === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Connexion au flux...</Text>
        </View>
      </View>
    );
  }

  // Invalid/expired link
  if (state === "invalid") {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <WifiOff size={48} color={colors.destructive} />
          <Text style={styles.invalidTitle}>Lien invalide ou expiré</Text>
          <Text style={styles.invalidSubtitle}>
            Demandez un nouveau lien au propriétaire
          </Text>
        </View>
      </View>
    );
  }

  // Access expired mid-view
  if (state === "expired") {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Clock size={48} color={colors.warning} />
          <Text style={styles.expiredTitle}>Accès expiré</Text>
          <Text style={styles.expiredSubtitle}>
            Le lien de partage a expiré. Demandez un nouveau lien.
          </Text>
        </View>
      </View>
    );
  }

  // Connected — show video with timer
  return (
    <View style={styles.container}>
      {/* Video player */}
      {shareInfo?.streamUrl ? (
        <View style={styles.videoWrapper}>
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: shareInfo.streamUrl }}
            rate={1.0}
            volume={isMuted ? 0 : 1.0}
            isMuted={isMuted}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay
            useNativeControls={false}
          />

          {/* Mute/unmute control */}
          <TouchableOpacity
            style={styles.muteButton}
            onPress={toggleMute}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={isMuted ? "Activer le son" : "Couper le son"}
          >
            {isMuted ? (
              <VolumeX size={24} color="#fff" />
            ) : (
              <Volume2 size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.videoPlaceholder}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* Info section */}
      <View style={styles.infoSection}>
        <View style={styles.timerRow}>
          <Clock size={16} color={colors.primary} />
          <Text style={styles.timerText}>{timeRemaining}</Text>
        </View>

        <View style={styles.ownerRow}>
          <User size={14} color={colors.textMuted} />
          <Text style={styles.ownerText}>
            Ce flux vous est partagé par {shareInfo?.ownerName || "le propriétaire"}
          </Text>
        </View>

        {shareInfo?.cameraName && (
          <Text style={styles.cameraNameLabel}>
            Caméra: {shareInfo.cameraName}
          </Text>
        )}

        <Text style={styles.footerNote}>
          Flux accessible uniquement sur le réseau local
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  invalidTitle: {
    ...typography.heading,
    color: colors.destructive,
    textAlign: "center",
    marginTop: spacing.md,
  },
  invalidSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    padding: spacing.xl,
    gap: spacing.md,
  },
  expiredTitle: {
    ...typography.heading,
    color: colors.warning,
    textAlign: "center",
  },
  expiredSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    position: "relative",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  muteButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoSection: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timerText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ownerText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  cameraNameLabel: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 13,
  },
  footerNote: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
