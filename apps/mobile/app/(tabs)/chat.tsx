import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
} from "react-native";
import { sendChatMessage, fetchChatCameras, type ChatCamera, type ChatResponse } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { Bot, User, Trash2, ChevronUp, ChevronDown, Send } from "lucide-react-native";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  cameraName?: string;
  snapshotIncluded?: boolean;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: "Bonjour ! Je suis votre assistant IA OVERSIGHT. Posez-moi une question sur vos caméras ou sites de surveillance.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameras, setCameras] = useState<ChatCamera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>();
  const [camerasOpen, setCamerasOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchChatCameras().then(setCameras).catch((err) => console.warn("Failed to load cameras:", err));
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    const history = messages.slice(-6).map(m => m.content);

    try {
      const res: ChatResponse = await sendChatMessage({
        message: userMsg.content,
        cameraId: selectedCameraId,
        history,
      });
      let cameraName: string | undefined;
      if (res.camerasQueried.length > 0) {
        const cam = cameras.find(c => c.id === res.camerasQueried[0]);
        cameraName = cam?.name ?? res.camerasQueried[0];
      }
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.answer,
        cameraName,
        snapshotIncluded: res.snapshotIncluded,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, une erreur est survenue. Veuillez réessayer.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Bonjour ! Je suis votre assistant IA OVERSIGHT. Posez-moi une question sur vos caméras ou sites de surveillance.",
    }]);
    setSelectedCameraId(undefined);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bot size={20} color={colors.primary} />
          <Text style={styles.title}>Chat IA</Text>
        </View>
        <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
          <Trash2 size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === "user" ? styles.userRow : styles.assistantRow]}>
            {item.role === "assistant" && (
              <View style={styles.avatarBot}>
                <Bot size={14} color={colors.primary} />
              </View>
            )}
            <View style={[styles.messageBubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.messageText, item.role === "user" ? styles.userText : styles.assistantText]}>
                {item.content}
              </Text>
              {item.cameraName && <Text style={styles.cameraRef}>Caméra : {item.cameraName}</Text>}
              {item.snapshotIncluded && <Text style={styles.snapshotRef}>Image analysée</Text>}
            </View>
            {item.role === "user" && (
              <View style={styles.avatarUser}>
                <User size={14} color="#fff" />
              </View>
            )}
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={styles.typingIndicator}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.typingText}>L'IA réfléchit...</Text>
          </View>
        ) : null}
      />

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.cameraSelector} onPress={() => setCamerasOpen(!camerasOpen)}>
          <Text style={styles.cameraSelectorText} numberOfLines={1}>
            {selectedCameraId ? cameras.find(c => c.id === selectedCameraId)?.name ?? "Caméra" : "Toutes les caméras"}
          </Text>
          {camerasOpen ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
        </TouchableOpacity>
        {camerasOpen && (
          <View style={styles.cameraDropdown}>
            <TouchableOpacity style={styles.cameraOption} onPress={() => { setSelectedCameraId(undefined); setCamerasOpen(false); }}>
              <Text style={[styles.cameraOptionText, !selectedCameraId && styles.cameraOptionActive]}>Toutes les caméras</Text>
            </TouchableOpacity>
            {cameras.map(cam => (
              <TouchableOpacity key={cam.id} style={styles.cameraOption} onPress={() => { setSelectedCameraId(cam.id); setCamerasOpen(false); }}>
                <Text style={[styles.cameraOptionText, selectedCameraId === cam.id && styles.cameraOptionActive]}>{cam.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Posez une question..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h3 },
  clearBtn: { padding: spacing.xs },
  messageList: { flex: 1 },
  messageListContent: { padding: spacing.lg, paddingBottom: spacing.sm },
  messageRow: { flexDirection: "row", marginBottom: spacing.md, gap: spacing.sm },
  userRow: { justifyContent: "flex-end" },
  assistantRow: { justifyContent: "flex-start" },
  avatarBot: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "rgba(6,182,212,0.1)",
    alignItems: "center", justifyContent: "center",
    alignSelf: "flex-end",
  },
  avatarUser: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    alignSelf: "flex-end",
  },
  messageBubble: { maxWidth: "80%", padding: spacing.md, borderRadius: borderRadius.lg },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  messageText: { fontSize: 15, lineHeight: 21 },
  userText: { color: "#fff" },
  assistantText: { color: colors.text },
  cameraRef: { marginTop: spacing.sm, fontSize: 12, color: colors.textMuted, fontStyle: "italic" },
  snapshotRef: { marginTop: 2, fontSize: 11, color: colors.textMuted, fontStyle: "italic" },
  typingIndicator: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.sm },
  typingText: { ...typography.caption, fontStyle: "italic" },
  inputBar: {
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.md, paddingBottom: 24, backgroundColor: colors.surface,
  },
  cameraSelector: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.sm },
  cameraSelectorText: { ...typography.caption, maxWidth: 200 },
  cameraDropdown: {
    backgroundColor: colors.elevated, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  cameraOption: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  cameraOptionText: { ...typography.caption, fontSize: 14 },
  cameraOptionActive: { color: colors.primary, fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1, backgroundColor: colors.bg, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text,
    fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    width: 44, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
});
