import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sendChatMessage, fetchChatCameras, type ChatCamera, type ChatResponse } from "@/lib/api";

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
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchChatCameras().then(setCameras).catch(() => {});
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

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
    setError(null);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat IA</Text>
        <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={18} color="#888" />
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
            <View style={[styles.messageBubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.messageText, item.role === "user" ? styles.userText : styles.assistantText]}>{item.content}</Text>
              {item.cameraName && <Text style={styles.cameraRef}>Caméra : {item.cameraName}</Text>}
              {item.snapshotIncluded && <Text style={styles.snapshotRef}>Image analysée</Text>}
            </View>
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={styles.typingIndicator}>
            <ActivityIndicator color="#888" size="small" />
            <Text style={styles.typingText}>L'IA réfléchit...</Text>
          </View>
        ) : null}
      />

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.cameraSelector} onPress={() => setCamerasOpen(!camerasOpen)}>
          <Text style={styles.cameraSelectorText} numberOfLines={1}>
            {selectedCameraId ? cameras.find(c => c.id === selectedCameraId)?.name ?? "Caméra" : "Toutes"}
          </Text>
          <Ionicons name={camerasOpen ? "chevron-up" : "chevron-down"} size={14} color="#888" />
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
            placeholderTextColor="#666"
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            multiline={false}
          />
          <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || loading}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#222" },
  title: { fontSize: 20, fontWeight: "bold", color: "#ededed" },
  clearBtn: { padding: 8 },
  messageList: { flex: 1 },
  messageListContent: { padding: 16, paddingBottom: 8 },
  messageRow: { marginBottom: 12 },
  userRow: { alignItems: "flex-end" },
  assistantRow: { alignItems: "flex-start" },
  messageBubble: { maxWidth: "85%", padding: 12, borderRadius: 12 },
  userBubble: { backgroundColor: "#2563eb", borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: "#1a1a2e", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#333" },
  messageText: { fontSize: 15, lineHeight: 21 },
  userText: { color: "#fff" },
  assistantText: { color: "#e0e0e0" },
  cameraRef: { marginTop: 6, fontSize: 12, color: "#888", fontStyle: "italic" },
  snapshotRef: { marginTop: 2, fontSize: 11, color: "#666", fontStyle: "italic" },
  typingIndicator: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingLeft: 4, gap: 8 },
  typingText: { color: "#888", fontSize: 13, fontStyle: "italic" },
  inputBar: { borderTopWidth: 1, borderTopColor: "#222", padding: 12, paddingBottom: 24, backgroundColor: "#111" },
  cameraSelector: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8, paddingHorizontal: 4 },
  cameraSelectorText: { color: "#888", fontSize: 13, fontWeight: "500", maxWidth: 180 },
  cameraDropdown: { backgroundColor: "#1a1a2e", borderRadius: 8, borderWidth: 1, borderColor: "#333", marginBottom: 8 },
  cameraOption: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#222" },
  cameraOptionText: { color: "#aaa", fontSize: 14 },
  cameraOptionActive: { color: "#2563eb", fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, backgroundColor: "#0a0a0a", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, color: "#ededed", fontSize: 15, borderWidth: 1, borderColor: "#333" },
  sendBtn: { backgroundColor: "#2563eb", borderRadius: 8, width: 44, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.5 },
});
