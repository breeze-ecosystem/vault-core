import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchWebhooks, createWebhook, deleteWebhook, testWebhook, type WebhookSubscription } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Webhook, Plus, RefreshCw, X } from "lucide-react-native";

const PAGE_SIZE = 20;

export default function WebhooksScreen() {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState("");

  const loadWebhooks = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchWebhooks({ limit: PAGE_SIZE, page: pageNum });
      if (append) setWebhooks(prev => [...prev, ...result.data]);
      else setWebhooks(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(t("webhooks.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const refresh = async () => {
    setRefreshing(true);
    await loadWebhooks(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || webhooks.length >= total) return;
    loadWebhooks(page + 1, true);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    try {
      const events = newEvents.split(",").map(e => e.trim()).filter(Boolean);
      await createWebhook({ name: newName.trim(), url: newUrl.trim(), events });
      setShowCreate(false);
      setNewName("");
      setNewUrl("");
      setNewEvents("");
      await loadWebhooks(1);
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message || t("common.error"));
    }
  };

  const handleDelete = (sub: WebhookSubscription) => {
    Alert.alert(t("webhooks.delete"), `${t("webhooks.deleteConfirm")}\n\n${sub.name} (${sub.url})`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try {
            await deleteWebhook(sub.id);
            await loadWebhooks(1);
          } catch (e: any) {
            Alert.alert(t("common.error"), e.message);
          }
        },
      },
    ]);
  };

  const handleTest = async (sub: WebhookSubscription) => {
    try {
      const result = await testWebhook(sub.id);
      Alert.alert(t("webhooks.test"), `${t("webhooks.testSuccess")} (HTTP ${result.statusCode})`);
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message);
    }
  };

  if (loading && webhooks.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (error && webhooks.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.destructive, marginBottom: spacing.md }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadWebhooks()}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={webhooks}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.subName}>{item.name}</Text>
              <View style={[styles.statusBadge, item.status === "active" ? styles.statusActive : styles.statusDisabled]}>
                <Text style={[styles.statusText, item.status === "active" ? styles.statusTextActive : styles.statusTextDisabled]}>
                  {item.status === "active" ? t("webhooks.active") : t("webhooks.disabled")}
                </Text>
              </View>
            </View>
            <Text style={styles.subUrl} numberOfLines={1}>{item.url}</Text>
            <Text style={styles.subEvents}>{item.events?.join(", ") || "—"}</Text>
            {item.lastDelivery && (
              <Text style={styles.lastDelivery}>
                {t("webhooks.lastDelivery")}: {new Date(item.lastDelivery).toLocaleDateString("fr-FR")}
              </Text>
            )}
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleTest(item)}>
                <Text style={styles.actionBtnText}>{t("webhooks.test")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDelete(item)}>
                <Text style={styles.actionBtnDangerText}>{t("webhooks.delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        estimatedItemSize={130}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Webhook size={20} color={colors.primary} />
            <Text style={styles.title}>{t("webhooks.title")}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
              <Plus size={16} color="#fff" />
              <Text style={styles.addText}>{t("webhooks.add")}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Webhook size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("webhooks.empty")}</Text>
          </View>
        ) : null}
        ListFooterComponent={
          webhooks.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("common.loading")}</Text>}
            </TouchableOpacity>
          ) : <View style={{ height: 24 }} />
        }
      />

      {/* Create modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("webhooks.addTitle")}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("webhooks.name")}
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="https://hooks.example.com/..."
              placeholderTextColor={colors.textMuted}
              value={newUrl}
              onChangeText={setNewUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="alert.created, door.opened (séparés par des virgules)"
              placeholderTextColor={colors.textMuted}
              value={newEvents}
              onChangeText={setNewEvents}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowCreate(false); setNewName(""); setNewUrl(""); setNewEvents(""); }}>
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreate} disabled={!newName.trim() || !newUrl.trim()}>
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
  loadingText: { ...typography.caption, marginTop: spacing.md },
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
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  subName: { ...typography.body, fontWeight: "600", flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusActive: { backgroundColor: "rgba(34,197,94,0.15)" },
  statusDisabled: { backgroundColor: "rgba(100,116,139,0.15)" },
  statusText: { fontSize: 11, fontWeight: "600" },
  statusTextActive: { color: "#22c55e" },
  statusTextDisabled: { color: colors.textMuted },
  subUrl: { ...typography.caption, fontSize: 12, fontFamily: "monospace", marginTop: 2 },
  subEvents: { ...typography.small, marginTop: 4 },
  lastDelivery: { ...typography.small, marginTop: 4 },
  cardActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: borderRadius.sm, backgroundColor: colors.surface },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  actionBtnDanger: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: borderRadius.sm, backgroundColor: "rgba(239,68,68,0.1)" },
  actionBtnDangerText: { fontSize: 12, fontWeight: "600", color: colors.destructive },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  retryText: { color: "#fff", ...typography.label, fontSize: 14 },
  loadMoreBtn: {
    padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: "center", marginTop: spacing.sm,
  },
  loadMoreText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalContent: { backgroundColor: colors.elevated, borderRadius: borderRadius.lg, padding: spacing.lg, width: "100%", maxWidth: 360 },
  modalTitle: { ...typography.h3, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.surface, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, color: colors.text, marginBottom: spacing.sm },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
  modalCancel: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalCancelText: { color: colors.textSecondary, fontSize: 14 },
  modalConfirm: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  modalConfirmText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
