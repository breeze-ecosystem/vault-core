import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchApiKeys, createApiKey, revokeApiKey, type ApiKey } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { KeyRound, Plus, RefreshCw, Copy, X } from "lucide-react-native";

const PAGE_SIZE = 20;

export default function ApiKeysScreen() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchApiKeys({ limit: PAGE_SIZE });
      setKeys(result.data);
    } catch (e) {
      setError(t("common.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const refresh = async () => {
    setRefreshing(true);
    await loadKeys();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const result = await createApiKey({ name: newKeyName.trim() });
      setCreatedRawKey(result.key || "Clé créée");
      setShowCreate(false);
      setNewKeyName("");
      await loadKeys();
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message || t("common.error"));
    }
  };

  const handleRevoke = (key: ApiKey) => {
    Alert.alert(t("apiKeys.revoke"), `${t("apiKeys.revokeConfirm")}\n\n${key.name}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("apiKeys.revoke"), style: "destructive",
        onPress: async () => {
          try {
            await revokeApiKey(key.id);
            await loadKeys();
          } catch (e: any) {
            Alert.alert(t("common.error"), e.message);
          }
        },
      },
    ]);
  };

  if (loading && keys.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* New key notification */}
      {createdRawKey && (
        <View style={styles.newKeyBanner}>
          <View style={styles.newKeyHeader}>
            <Copy size={16} color={colors.warning} />
            <Text style={styles.newKeyTitle}>{t("apiKeys.createSuccess")}</Text>
            <TouchableOpacity onPress={() => setCreatedRawKey(null)}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.newKeyHint}>{t("apiKeys.keyCopy")}</Text>
          <Text style={styles.newKeyValue} selectable>{createdRawKey}</Text>
        </View>
      )}

      <FlashList
        data={keys}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.status || item.status === "revoked" ? styles.cardRevoked : null]}>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.keyName}>{item.name}</Text>
                <View style={[styles.statusBadge, (item.status === "revoked" || item.status !== "active") ? styles.statusRevoked : styles.statusActive]}>
                  <Text style={[styles.statusText, (item.status === "revoked" || item.status !== "active") ? styles.statusTextRevoked : styles.statusTextActive]}>
                    {item.status === "revoked" || item.status !== "active" ? t("apiKeys.revoked") : t("apiKeys.active")}
                  </Text>
                </View>
              </View>
              <Text style={styles.keyPreview}>sk-••••{item.id?.slice(-4) || "XXXX"}</Text>
              <Text style={styles.lastUsed}>{t("apiKeys.lastUsed")}: {item.lastUsed ? new Date(item.lastUsed).toLocaleDateString("fr-FR") : t("apiKeys.neverUsed")}</Text>
            </View>
            {(!item.status || item.status === "active") && (
              <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevoke(item)}>
                <Text style={styles.revokeText}>{t("apiKeys.revoke")}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        estimatedItemSize={100}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <KeyRound size={20} color={colors.primary} />
            <Text style={styles.title}>{t("apiKeys.title")}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
              <Plus size={16} color="#fff" />
              <Text style={styles.addText}>{t("apiKeys.add")}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <KeyRound size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("apiKeys.empty")}</Text>
          </View>
        ) : null}
      />

      {/* Create modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("apiKeys.addTitle")}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("apiKeys.name")}
              placeholderTextColor={colors.textMuted}
              value={newKeyName}
              onChangeText={setNewKeyName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowCreate(false); setNewKeyName(""); }}>
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreate} disabled={!newKeyName.trim()}>
                <Text style={styles.modalConfirmText}>{t("common.create")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  scroll: { padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  title: { ...typography.h2, flex: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md },
  addText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: colors.elevated, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.borderLight,
    padding: spacing.md,
  },
  cardRevoked: { opacity: 0.6 },
  cardBody: { marginBottom: spacing.sm },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  keyName: { ...typography.body, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusActive: { backgroundColor: "rgba(34,197,94,0.15)" },
  statusRevoked: { backgroundColor: "rgba(239,68,68,0.15)" },
  statusText: { fontSize: 11, fontWeight: "600" },
  statusTextActive: { color: "#22c55e" },
  statusTextRevoked: { color: "#ef4444" },
  keyPreview: { ...typography.caption, fontFamily: "monospace", marginTop: 4 },
  lastUsed: { ...typography.small, marginTop: 4 },
  revokeBtn: { alignSelf: "flex-end" },
  revokeText: { color: colors.destructive, fontSize: 12, fontWeight: "600" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
  newKeyBanner: {
    backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
    borderRadius: borderRadius.md, margin: spacing.lg, marginBottom: 0, padding: spacing.md,
  },
  newKeyHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  newKeyTitle: { flex: 1, ...typography.label, fontSize: 13, color: colors.warning },
  newKeyHint: { ...typography.caption, fontSize: 12, marginBottom: spacing.sm },
  newKeyValue: { ...typography.caption, fontFamily: "monospace", backgroundColor: colors.surface, padding: spacing.sm, borderRadius: borderRadius.sm, fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalContent: { backgroundColor: colors.elevated, borderRadius: borderRadius.lg, padding: spacing.lg, width: "100%", maxWidth: 340 },
  modalTitle: { ...typography.h3, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.surface, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, color: colors.text, marginBottom: spacing.md },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  modalCancel: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalCancelText: { color: colors.textSecondary, fontSize: 14 },
  modalConfirm: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  modalConfirmText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
