import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchMaintenanceTickets, createMaintenanceTicket, type MaintenanceTicket } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Wrench, Plus, RefreshCw } from "lucide-react-native";

const PAGE_SIZE = 20;

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#3b82f6",
  LOW: "#6b7280",
};

const PRIORITY_BG: Record<string, string> = {
  CRITICAL: "rgba(239,68,68,0.15)",
  HIGH: "rgba(245,158,11,0.15)",
  MEDIUM: "rgba(59,130,246,0.15)",
  LOW: "rgba(107,114,128,0.15)",
};

function getStatusLabel(status: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    open: t("maintenance.open"),
    in_progress: t("maintenance.inProgress"),
    resolved: t("maintenance.resolved"),
    closed: t("maintenance.closed"),
  };
  return map[status] || status;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function MaintenanceScreen() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const loadTickets = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchMaintenanceTickets({ limit: PAGE_SIZE, page: pageNum });
      if (append) setTickets(prev => [...prev, ...result.data]);
      else setTickets(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(t("maintenance.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const refresh = async () => {
    setRefreshing(true);
    await loadTickets(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || tickets.length >= total) return;
    loadTickets(page + 1, true);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await createMaintenanceTicket({ title: newTitle.trim(), description: newDescription.trim() || undefined });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
      await loadTickets(1);
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message || t("common.error"));
    }
  };

  const showDetail = (ticket: MaintenanceTicket) => {
    Alert.alert(
      ticket.title,
      `${t("maintenance.priority")}: ${t(`maintenance.${ticket.priority?.toLowerCase() || "medium"}`)}\n${t("maintenance.status")}: ${getStatusLabel(ticket.status, t)}\n${t("maintenance.assignedTo")}: ${ticket.assignedTo || "—"}\n${t("maintenance.date")}: ${formatDate(ticket.createdAt)}\n\n${t("audit.details")}: ${ticket.description || "—"}`,
    );
  };

  if (loading && tickets.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.destructive, marginBottom: spacing.md }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadTickets()}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={tickets}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => showDetail(item)}>
            <View style={styles.cardTop}>
              <Text style={styles.ticketTitle} numberOfLines={1}>{item.title}</Text>
              {item.priority && (
                <View style={[styles.prioBadge, { backgroundColor: PRIORITY_BG[item.priority] || PRIORITY_BG.MEDIUM }]}>
                  <Text style={[styles.prioText, { color: PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.MEDIUM }]}>
                    {t(`maintenance.${item.priority?.toLowerCase() || "medium"}`)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cardMeta}>
              <View style={[styles.statusChip, { backgroundColor: item.status === "resolved" ? "rgba(34,197,94,0.15)" : item.status === "open" ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)" }]}>
                <Text style={[styles.statusChipText, { color: item.status === "resolved" ? "#22c55e" : item.status === "open" ? "#3b82f6" : "#f59e0b" }]}>
                  {getStatusLabel(item.status, t)}
                </Text>
              </View>
              {item.assignedTo && (
                <Text style={styles.assignedText}>{t("maintenance.assignedTo")}: {item.assignedTo}</Text>
              )}
            </View>
            <Text style={styles.dateText}>{t("maintenance.date")}: {formatDate(item.createdAt)}</Text>
          </TouchableOpacity>
        )}
        estimatedItemSize={110}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Wrench size={20} color={colors.primary} />
            <Text style={styles.title}>{t("maintenance.title")}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
              <Plus size={16} color="#fff" />
              <Text style={styles.addText}>{t("maintenance.create")}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Wrench size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("maintenance.empty")}</Text>
          </View>
        ) : null}
        ListFooterComponent={
          tickets.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("common.loadMore", { remaining: total - tickets.length })}</Text>}
            </TouchableOpacity>
          ) : <View style={{ height: 24 }} />
        }
      />

      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("maintenance.createTitle")}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("maintenance.title")}
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              placeholder={t("common.description")}
              placeholderTextColor={colors.textMuted}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowCreate(false); setNewTitle(""); setNewDescription(""); }}>
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreate} disabled={!newTitle.trim()}>
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
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  ticketTitle: { ...typography.body, fontWeight: "600", flex: 1 },
  prioBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  prioText: { fontSize: 11, fontWeight: "600" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusChipText: { fontSize: 11, fontWeight: "600" },
  assignedText: { ...typography.small },
  dateText: { ...typography.small, marginTop: 2 },
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
  modalInputMultiline: { minHeight: 70, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
  modalCancel: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalCancelText: { color: colors.textSecondary, fontSize: 14 },
  modalConfirm: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  modalConfirmText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
