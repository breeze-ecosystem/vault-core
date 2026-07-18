import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { Video, ResizeMode, type AVPlaybackStatus, type AVPlaybackStatusError } from "expo-av";
import { Audio } from "expo-av";
import { PinchGestureHandler, TapGestureHandler, State } from "react-native-gesture-handler";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Camera,
  Maximize2,
  Minimize2,
  WifiOff,
  RefreshCw,
} from "lucide-react-native";
import { colors, typography, spacing } from "@/lib/theme";

type ConnectionState = "connecting" | "connected" | "offline";

interface LiveStreamViewerProps {
  streamUrl: string;
  cameraName: string;
  substreamUrl?: string;
  onBack: () => void;
  onSnapshot?: () => void;
}

export function LiveStreamViewer({
  streamUrl,
  cameraName,
  substreamUrl,
  onBack,
  onSnapshot,
}: LiveStreamViewerProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<"HD" | "SD">("HD");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<Video | null>(null);
  const previousIsMuted = useRef(isMuted);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Configure audio session for background playback
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      Audio.setAudioModeAsync({
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
      }).catch(() => {});
    };
  }, []);

  const showControls = useCallback(() => {
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setControlsVisible(true);

    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setControlsVisible(false));
    }, 3000);
  }, [controlsOpacity]);

  useEffect(() => {
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    showControls();
  }, [showControls]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    showControls();
  }, [showControls]);

  const toggleQuality = useCallback(() => {
    setQuality((prev) => (prev === "HD" ? "SD" : "HD"));
    showControls();
  }, [showControls]);

  const handleRetry = useCallback(() => {
    setConnectionState("connecting");
    setStreamError(null);
    setRetryCount((prev) => prev + 1);
  }, []);

  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        setConnectionState("connected");
      } else if ("error" in status) {
        setConnectionState("offline");
        setStreamError((status as AVPlaybackStatusError).error || "Erreur de lecture");
      }
    },
    [],
  );

  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: scaleAnim } }],
    { useNativeDriver: true },
  );

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { scale } = event.nativeEvent;
      const clamped = Math.min(Math.max(scale, 0.5), 3);
      Animated.spring(scaleAnim, {
        toValue: clamped,
        useNativeDriver: true,
      }).start();
    }
  };

  const onDoubleTap = (_event: any) => {
    toggleFullscreen();
  };

  const activeUrl = quality === "HD" ? streamUrl : substreamUrl || streamUrl;

  return (
    <PinchGestureHandler
      onGestureEvent={onPinchGestureEvent}
      onHandlerStateChange={onPinchHandlerStateChange}
    >
      <Animated.View style={[styles.container, isFullscreen && StyleSheet.absoluteFill]}>
        <TapGestureHandler onHandlerStateChange={onDoubleTap} numberOfTaps={2}>
          <Pressable style={styles.videoWrapper} onPress={showControls}>
            <Video
              ref={videoRef}
              style={styles.video}
              source={{ uri: activeUrl }}
              rate={1.0}
              volume={isMuted ? 0 : 1.0}
              isMuted={isMuted}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay
              useNativeControls={false}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
              key={`${activeUrl}-${retryCount}`}
            />

            {/* Connecting overlay */}
            {connectionState === "connecting" && (
              <View style={styles.overlay}>
                <View style={styles.spinner} />
                <Text style={styles.overlayText}>Connexion au flux...</Text>
              </View>
            )}

            {/* Offline overlay */}
            {connectionState === "offline" && (
              <View style={[styles.overlay, styles.offlineOverlay]}>
                <WifiOff size={48} color={colors.destructive} />
                <Text style={[styles.overlayText, { color: colors.destructive, marginTop: spacing.md }]}>
                  Flux hors ligne
                </Text>
                {streamError && (
                  <Text style={styles.errorDetail}>{streamError}</Text>
                )}
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={18} color="#fff" />
                  <Text style={styles.retryText}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Controls overlay */}
            <Animated.View
              style={[
                styles.controlsContainer,
                { opacity: controlsOpacity },
                !controlsVisible && { pointerEvents: "none" as const },
              ]}
              pointerEvents={controlsVisible ? "auto" : "none"}
            >
              {/* Top bar */}
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={onBack}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel="Retour"
                >
                  <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.centerInfo}>
                  <Text style={styles.cameraName} numberOfLines={1}>
                    {cameraName}
                  </Text>
                  {connectionState === "connected" && (
                    <Text style={styles.connectedStatus}>En direct</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.controlBtn}
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

              {/* Bottom bar */}
              <View style={styles.bottomBar}>
                {onSnapshot && (
                  <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={onSnapshot}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Capture d'écran"
                  >
                    <Camera size={24} color="#fff" />
                  </TouchableOpacity>
                )}

                {substreamUrl && (
                  <TouchableOpacity
                    style={[styles.qualityBtn, quality === "HD" && styles.qualityActive]}
                    onPress={toggleQuality}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Changer la qualité"
                  >
                    <Text style={[styles.qualityText, quality === "HD" && styles.qualityTextActive]}>
                      {quality}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={toggleFullscreen}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                  {isFullscreen ? (
                    <Minimize2 size={24} color="#fff" />
                  ) : (
                    <Maximize2 size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Pressable>
        </TapGestureHandler>
      </Animated.View>
    </PinchGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject as object,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  offlineOverlay: {
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: "transparent",
  },
  overlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginTop: spacing.md,
  },
  errorDetail: {
    color: "#ccc",
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    marginTop: spacing.lg,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject as object,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.base,
  },
  centerInfo: {
    flex: 1,
    alignItems: "center",
  },
  cameraName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    maxWidth: 200,
  },
  connectedStatus: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: spacing.xl,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  qualityBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  qualityActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(6,182,212,0.2)",
  },
  qualityText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "700",
  },
  qualityTextActive: {
    color: colors.primary,
  },
});
