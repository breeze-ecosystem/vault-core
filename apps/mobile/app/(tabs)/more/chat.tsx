import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { colors } from "@repo/design";
import { useRouter } from "expo-router";
import { Send, Mic, MicOff, Bot, ChevronLeft } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { agentChat, createAgentChatSSE } from "@/lib/api";

// ─── Types ───

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

type RecordingState = "idle" | "recording" | "transcribing";

const QUICK_ACTIONS = [
  "Voir les alertes",
  "Caméras actives",
  "État des portes",
  "Signalement",
];

const EMPTY_GREETING =
  "Assistant de sécurité. Posez une question ou utilisez une action rapide.";

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: "Connecté",
  reconnecting: "Reconnexion...",
  disconnected: "Déconnecté",
};

// ─── Component ───

export default function MoreChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Message state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");

  // Agent state
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const controllerRef = useRef<AbortController | null>(null);

  // Voice state
  const [recordingState, setRecordingState] =
    useState<RecordingState>("idle");

  // Offline state
  const [isOnline, setIsOnline] = useState(true);

  // ─── Helpers ───

  const sessionIdRef = useRef<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const appendMessage = useCallback(
    (msg: Omit<ChatMessage, "id" | "timestamp">) => {
      const newMsg: ChatMessage = {
        ...msg,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMsg]);
    },
    [],
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ─── Send message ───

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !isOnline) return;

      const trimmed = text.trim();
      setInputText("");
      setErrorMsg(null);

      // Append user message
      appendMessage({ role: "user", content: trimmed });

      // Start streaming if online
      if (isOnline) {
        setIsStreaming(true);
        setConnectionStatus("connected");

        // Add empty agent message for streaming
        const agentMsgId = `${Date.now()}-${Math.random()}`;
        const agentMsg: ChatMessage = {
          id: agentMsgId,
          role: "agent",
          content: "",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMsg]);

        let accumulated = "";

        // Teardown previous controller
        if (controllerRef.current) {
          controllerRef.current.abort();
        }

        const controller = createAgentChatSSE(
          trimmed,
          sessionIdRef.current,
          (token: string) => {
            accumulated += token;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId ? { ...m, content: accumulated } : m,
              ),
            );
          },
          () => {
            setIsStreaming(false);
            setConnectionStatus("connected");
            controllerRef.current = null;
          },
          (err: Error) => {
            console.warn("[chat] SSE error:", err.message);
            setIsStreaming(false);
            setConnectionStatus("disconnected");
            setErrorMsg(err.message);
            controllerRef.current = null;
            // Fallback: if SSE fails, try synchronous endpoint
            if (accumulated === "") {
              agentChat(trimmed)
                .then((res) => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === agentMsgId
                        ? { ...m, content: res.response }
                        : m,
                    ),
                  );
                  if (res.sessionId) sessionIdRef.current = res.sessionId;
                })
                .catch((fallbackErr) => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === agentMsgId
                        ? {
                            ...m,
                            content:
                              "Désolé, le service IA est actuellement indisponible.",
                          }
                        : m,
                    ),
                  );
                });
            }
          },
        );
        controllerRef.current = controller;

        // Update session
        if (sessionIdRef.current === "") {
          sessionIdRef.current = `mobile-${Date.now()}`;
        }
      }
    },
    [isOnline, appendMessage],
  );

  // ─── Quick actions ───

  const handleQuickAction = useCallback(
    (action: string) => {
      sendMessage(action);
    },
    [sendMessage],
  );

  // ─── Voice recording ───

  const handleMicPress = useCallback(() => {
    if (recordingState === "idle") {
      // Start recording (simulated for now)
      setRecordingState("recording");
      // In production: expo-av Audio.Recording would be used here
      // After recording completes, transcribe via /api/v1/audio/transcribe
      // For now, simulate with a timeout
      setTimeout(() => {
        setRecordingState("transcribing");
        setTimeout(() => {
          setRecordingState("idle");
          const transcribedText = "Message vocal transcrit";
          setInputText(transcribedText);
        }, 1500);
      }, 3000);
    } else if (recordingState === "recording") {
      // Stop recording early
      setRecordingState("transcribing");
      setTimeout(() => {
        setRecordingState("idle");
        const transcribedText = "Message vocal transcrit";
        setInputText(transcribedText);
      }, 1500);
    }
  }, [recordingState]);

  // ─── Offline detection ───

  useEffect(() => {
    // Use a simple fetch check for connectivity
    let mounted = true;
    const checkConnectivity = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch("https://clients3.google.com/generate_204", {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (mounted) {
          setIsOnline(true);
          if (
            connectionStatus === "disconnected" &&
            messages.length > 0
          ) {
            setConnectionStatus("reconnecting");
          }
        }
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    checkConnectivity();
    const interval = setInterval(checkConnectivity, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [connectionStatus, messages.length]);

  // ─── Cleanup on unmount ───

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  // ─── Connection status indicator color ───

  const statusDotColor =
    connectionStatus === "connected"
      ? colors.shared.success
      : connectionStatus === "reconnecting"
        ? colors.shared.warning
        : colors.shared.destructive;

  // ─── Render ───

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top + 56}
    >
      {/* ── Header ── */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={colors.dark.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Chat IA</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
            <Text style={styles.statusLabel}>
              {STATUS_LABELS[connectionStatus]}
            </Text>
          </View>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* ── Offline banner ── */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Hors ligne. Le chat nécessite une connexion.
          </Text>
        </View>
      )}

      {/* ── Error banner ── */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
          <Pressable onPress={() => setErrorMsg(null)}>
            <Text style={styles.errorDismiss}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* ── Message list ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={[
          styles.messageListContent,
          messages.length === 0 && styles.messageListEmpty,
        ]}
        onContentSizeChange={() => scrollToBottom()}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Bot size={48} color={colors.dark.textMuted} />
            <Text style={styles.emptyGreeting}>{EMPTY_GREETING}</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isStreaming={
                msg.role === "agent" &&
                isStreaming &&
                msg === messages[messages.length - 1]
              }
            />
          ))
        )}
      </ScrollView>

      {/* ── Voice recording indicator ── */}
      {recordingState !== "idle" && (
        <View style={styles.recordingBar}>
          {recordingState === "recording" ? (
            <>
              <View style={styles.recordingWaveform}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveformBar,
                      { height: 12 + Math.sin(Date.now() / 200 + i) * 8 },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.recordingText}>Parlez maintenant...</Text>
            </>
          ) : (
            <>
              <ActivityIndicator size="small" color={colors.shared.primary} />
              <Text style={styles.recordingText}>Transcription en cours...</Text>
            </>
          )}
        </View>
      )}

      {/* ── Quick actions bar ── */}
      <View style={styles.quickActionsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsContent}
        >
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action}
              style={({ pressed }) => [
                styles.quickActionChip,
                pressed && styles.quickActionChipPressed,
              ]}
              onPress={() => handleQuickAction(action)}
              disabled={!isOnline || isStreaming}
              accessibilityLabel={action}
              accessibilityRole="button"
            >
              <Text style={styles.quickActionLabel}>{action}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Input area ── */}
      <View
        style={[
          styles.inputArea,
          { paddingBottom: insets.bottom + 8 },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            !isOnline && styles.textInputDisabled,
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Écrivez votre message..."
          placeholderTextColor={colors.dark.textMuted}
          multiline
          maxLength={2000}
          editable={isOnline && !isStreaming}
          onSubmitEditing={() => {
            if (inputText.trim()) {
              sendMessage(inputText);
            }
          }}
          blurOnSubmit={false}
          returnKeyType="send"
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            pressed && styles.sendButtonPressed,
            (!inputText.trim() || !isOnline || isStreaming) &&
              styles.sendButtonDisabled,
          ]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || !isOnline || isStreaming}
          accessibilityLabel="Envoyer le message"
          aria-label="Envoyer le message"
          accessibilityRole="button"
        >
          <Send
            size={20}
            color={
              !inputText.trim() || !isOnline || isStreaming
                ? colors.dark.textMuted
                : colors.dark.text
            }
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.micButton,
            pressed && styles.micButtonPressed,
            recordingState === "recording" && styles.micButtonRecording,
          ]}
          onPress={handleMicPress}
          disabled={!isOnline || isStreaming}
          accessibilityLabel={
            recordingState === "recording"
              ? "Arrêter l'enregistrement"
              : "Activer le microphone"
          }
          aria-label={
            recordingState === "recording"
              ? "Arrêter l'enregistrement"
              : "Activer le microphone"
          }
          accessibilityRole="button"
        >
          {recordingState === "recording" ? (
            <MicOff size={24} color={colors.dark.text} />
          ) : (
            <Mic
              size={24}
              color={!isOnline || isStreaming ? colors.dark.textMuted : colors.dark.text}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── ChatBubble sub-component ───

function ChatBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowAgent,
      ]}
    >
      {!isUser && (
        <View style={styles.bubbleAvatar}>
          <Bot size={16} color={colors.shared.primary} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAgent,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.bubbleTextUser : styles.bubbleTextAgent,
          ]}
        >
          {message.content}
          {isStreaming && !isUser && (
            <Text style={styles.streamingCursor}> ▍</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },

  // Header
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.dark.text,
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusLabel: {
    fontSize: 11,
    color: colors.dark.textMuted,
  },

  // Offline banner
  offlineBanner: {
    backgroundColor: colors.shared.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  offlineBannerText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a2e",
  },

  // Error banner
  errorBanner: {
    backgroundColor: colors.shared.destructive,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.dark.text,
    flex: 1,
  },
  errorDismiss: {
    fontSize: 16,
    color: colors.dark.text,
    paddingLeft: 12,
    fontWeight: "700",
  },

  // Message list
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 12,
    paddingBottom: 16,
  },
  messageListEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyGreeting: {
    marginTop: 16,
    fontSize: 15,
    color: colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },

  // Chat bubbles
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 12,
    maxWidth: SCREEN_WIDTH - 24,
  },
  bubbleRowUser: {
    justifyContent: "flex-end",
    alignSelf: "flex-end",
  },
  bubbleRowAgent: {
    justifyContent: "flex-start",
    alignSelf: "flex-start",
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  bubbleUser: {
    backgroundColor: colors.shared.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: "#ffffff",
  },
  bubbleTextAgent: {
    color: colors.dark.text,
  },
  streamingCursor: {
    color: colors.shared.primary,
  },

  // Recording bar
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    gap: 12,
  },
  recordingWaveform: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  waveformBar: {
    width: 3,
    backgroundColor: colors.shared.destructive,
    borderRadius: 2,
  },
  recordingText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },

  // Quick actions bar
  quickActionsBar: {
    paddingVertical: 8,
    backgroundColor: colors.dark.bg,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  quickActionsContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickActionChip: {
    backgroundColor: colors.dark.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  quickActionChipPressed: {
    backgroundColor: colors.dark.elevated,
    borderColor: colors.shared.primary,
  },
  quickActionLabel: {
    fontSize: 14,
    color: colors.dark.text,
    fontWeight: "500",
  },

  // Input area
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.dark.elevated,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.dark.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  textInputDisabled: {
    opacity: 0.4,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.shared.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.dark.elevated,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dark.elevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  micButtonPressed: {
    opacity: 0.7,
  },
  micButtonRecording: {
    backgroundColor: colors.shared.destructive,
    borderColor: colors.shared.destructive,
  },
});
