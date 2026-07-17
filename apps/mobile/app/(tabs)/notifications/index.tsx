import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import FlashList from "@shopify/flash-list";
import {
  getNotificationSettings, updateNotificationSettings,
  getNotificationLogs, sendTestNotification,
  type NotificationLog,
} from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Mail, Link, Bell, BellOff, RefreshCw, CheckCircle, Clock, XCircle } from "lucide-react-native";

type FilterTab = "all" | "unread";

const STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  SENT: { icon: <CheckCircle size={14} color="#22c55e" />, color: "#22c55e" },
  PENDING: { icon: <Clock size={14} color="#eab308" />, color: "#eab308" },
  FAILED: { icon: <XCircle size={14} color="#ef4444" />, color: "#ef4444" },
};

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "Email",
  WEBHOOK: "Webhook",
  IN_APP: "In-App",
};

export default function NotificationsTabScreen() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // Settings state
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [inAppEnabled, setInAppEnabled] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [logResult, settings] = await Promise.all([
        getNotificationLogs({ limit: 50 }).catch(() => ({ data: [], total: 0, page: 1, limit: 50 })),
        getNotificationSettings().catch(() => []),
      ]);
      setLogs(logResult.data || []);
      setLogTotal(logResult.total || 0);

      const emailS = settings.find(x => x.channel === "EMAIL");
      setEmailEnabled(emailS?.enabled ?? false);
      setEmailAddress(((emailS?.config ?? {}) as Record<string, string>)?.email ?? "");

      const webhookS = settings.find(x => x.channel === "WEBHOOK");
      setWebhookEnabled(webhookS?.enabled ?? false);
      setWebhookUrl(((webhookS?.config ?? {}) as Record<string, string>)?.url ?? "");

      const inAppS = settings.find(x => x.channel === "IN_APP");
      setInAppEnabled(inAppS?.enabled ?? true);
    } catch {
      setError(t("common.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings([
        { channel: "EMAIL", enabled: emailEnabled, config: emailAddress ? { email: emailAddress } : {} },
        { channel: "WEBHOOK", enabled: webhookEnabled, config: webhookUrl ? { url: webhookUrl } : {} },
        { channel: "IN_APP", enabled: inAppEnabled },
      ]);
      Alert.alert(t("common.success"), t("notifications.saved"));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("notifications.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await sendTestNotification();
      Alert.alert(t("notifications.test"), result.message || t("notifications.testSent"));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("notifications.testFailed"));
    } finally {
      setTesting(false);
    }
  };

  const filteredLogs = logs; // All notifications shown, filtering via tabs

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerBar}>
        <Bell size={20} color={colors.primary} />
        <Text style={styles.title}>{t("notifications.title")}</Text>
        <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
          {testing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.testBtnText}>{t("notifications.test")}</Text>}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <RefreshCw size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Channels Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("notifications.channels")}</Text>

        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <View style={styles.channelInfo}>
              <Mail size={18} color={colors.textMuted} />
              <Text style={styles.channelName}>{t("notifications.email")}</Text>
            </View>
            <Switch
              value={emailEnabled} onValueChange={setEmailEnabled}
              trackColor={{ false: "#333", true: colors.primary }} thumbColor="#fff"
            />
          </View>
          {emailEnabled && (
            <TextInput
              style={styles.input} placeholder={t("notifications.emailPlaceholder")}
              placeholderTextColor={colors.textMuted} value={emailAddress}
              onChangeText={setEmailAddress} keyboardType="email-address" autoCapitalize="none"
            />
          )}
        </View>

        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <View style={styles.channelInfo}>
              <Link size={18} color={colors.textMuted} />
              <Text style={styles.channelName}>{t("notifications.webhook")}</Text>
            </View>
            <Switch
              value={webhookEnabled} onValueChange={setWebhookEnabled}
              trackColor={{ false: "#333", true: colors.primary }} thumbColor="#fff"
            />
          </View>
          {webhookEnabled && (
            <TextInput
              style={styles.input} placeholder={t("notifications.webhookPlaceholder")}
              placeholderTextColor={colors.textMuted} value={webhookUrl}
              onChangeText={setWebhookUrl} keyboardType="url" autoCapitalize="none"
            />
          )}
        </View>

        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <View style={styles.channelInfo}>
              <Bell size={18} color={colors.textMuted} />
              <Text style={styles.channelName}>{t("notifications.inApp")}</Text>
            </View>
            <Switch
              value={inAppEnabled} onValueChange={setInAppEnabled}
              trackColor={{ false: "#333", true: colors.primary }} thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{t("notifications.save")}</Text>}
        </TouchableOpacity>
      </View>

      {/* History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("notifications.history", { count: logTotal })}</Text>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(["all", "unread"] as FilterTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filterTab === tab && styles.filterTabActive]}
              onPress={() => setFilterTab(tab)}
            >
              <Text style={[styles.filterText, filterTab === tab && styles.filterTextActive]}>
                {tab === "all" ? t("notifications.filterAll") : t("notifications.unread")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredLogs.length === 0 ? (
          <View style={styles.emptySection}>
            <BellOff size={36} color={colors.border} />
            <Text style={styles.emptyText}>{t("notifications.emptyLogs")}</Text>
          </View>
        ) : (
          filteredLogs.map(log => {
            const statusIcon = STATUS_ICONS[log.status] || STATUS_ICONS.PENDING;
            return (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logTop}>
                  <View style={styles.logSeverity}>
                    <Text style={styles.severityText}>{log.alert.severity}</Text>
                  </View>
                  <View style={[styles.logStatusBadge, { backgroundColor: statusIcon.color + "20" }]}>
                    {statusIcon.icon}
                    <Text style={[styles.logStatusText, { color: statusIcon.color }]}>{t(`notifications.status.${log.status.toLowerCase()}` as any) || log.status}</Text>
                  </View>
                </View>
                <Text style={styles.logTitle} numberOfLines={1}>{log.alert.title}</Text>
                <View style={styles.logMeta}>
                  <Text style={styles.logMetaText}>{CHANNEL_LABELS[log.channel] || log.channel}</Text>
                  <Text style={styles.logMetaDot}>·</Text>
                  <Text style={styles.logMetaText} numberOfLines={1}>{log.recipient}</Text>
                </View>
                <Text style={styles.logDate}>
                  {new Date(log.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Text>
                {log.error && <Text style={styles.logError}>{log.error}</Text>}
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  headerBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.h2, flex: 1 },
  testBtn: { backgroundColor: colors.textMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  testBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  errorBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: spacing.lg, padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md },
  errorText: { ...typography.caption, color: colors.destructive, flex: 1 },
  section: { padding: spacing.lg, paddingBottom: 0 },
  sectionTitle: { ...typography.label, fontSize: 14, marginBottom: spacing.md },
  channelCard: { backgroundColor: colors.elevated, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  channelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  channelInfo: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  channelName: { ...typography.body, fontWeight: "500" },
  input: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, color: colors.text, fontSize: 14 },
  saveBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: "center", marginTop: spacing.xs },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  filterTab: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  filterTabActive: { backgroundColor: colors.primary + "20", borderColor: colors.primary },
  filterText: { ...typography.caption, fontWeight: "500" },
  filterTextActive: { color: colors.primary },
  emptySection: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },
  logCard: { backgroundColor: colors.elevated, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  logTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  logSeverity: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.surface },
  severityText: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  logStatusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  logStatusText: { fontSize: 11, fontWeight: "600" },
  logTitle: { ...typography.body, fontWeight: "500", marginBottom: 4 },
  logMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  logMetaText: { ...typography.small },
  logMetaDot: { color: colors.textMuted },
  logDate: { ...typography.small, color: colors.textMuted },
  logError: { fontSize: 11, color: colors.destructive, marginTop: 4 },
});
