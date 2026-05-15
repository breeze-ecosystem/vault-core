import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Switch, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import {
  getNotificationSettings, updateNotificationSettings,
  getNotificationLogs, sendTestNotification,
  type NotificationLog,
} from "@/lib/api";
import { colors } from "@/lib/theme";
import { Mail, Link, Bell, BellOff } from "lucide-react-native";

export default function NotificationsScreen() {
  const [logs, setLogs] = useState<{ data: NotificationLog[]; total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [inAppEnabled, setInAppEnabled] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const l = await getNotificationLogs({ limit: 20 });
      const s = await getNotificationSettings();
      setLogs(l);

      const email = s.find(x => x.channel === "EMAIL");
      setEmailEnabled(email?.enabled ?? false);
      setEmailAddress(((email?.config ?? {}) as Record<string, string>)?.email ?? "");

      const webhook = s.find(x => x.channel === "WEBHOOK");
      setWebhookEnabled(webhook?.enabled ?? false);
      setWebhookUrl(((webhook?.config ?? {}) as Record<string, string>)?.url ?? "");

      const inApp = s.find(x => x.channel === "IN_APP");
      setInAppEnabled(inApp?.enabled ?? true);
    } catch {
      setLogs({ data: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings([
        { channel: "EMAIL", enabled: emailEnabled, config: emailAddress ? { email: emailAddress } : {} },
        { channel: "WEBHOOK", enabled: webhookEnabled, config: webhookUrl ? { url: webhookUrl } : {} },
        { channel: "IN_APP", enabled: inAppEnabled },
      ]);
      await loadData();
      Alert.alert("Succes", "Parametres de notification sauvegardes");
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Echec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await sendTestNotification();
      Alert.alert("Test", result.message || "Notification test envoyee");
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Echec de l'envoi test");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const severityColor: Record<string, string> = {
    CRITICAL: "#dc2626", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#3b82f6", INFO: "#6b7280",
  };
  const statusColor: Record<string, string> = {
    PENDING: "#eab308", SENT: "#22c55e", FAILED: "#dc2626",
  };
  const channelLabel: Record<string, string> = {
    EMAIL: "Email", WEBHOOK: "Webhook", IN_APP: "In-App",
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
          {testing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.testBtnText}>Tester</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Canaux</Text>

        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <View style={styles.channelInfo}>
              <Mail size={20} color={colors.textMuted} />
              <Text style={styles.channelName}>Email</Text>
            </View>
            <Switch
              value={emailEnabled} onValueChange={setEmailEnabled}
              trackColor={{ false: "#333", true: "#2563eb" }} thumbColor="#fff"
            />
          </View>
          {emailEnabled && (
            <TextInput
              style={styles.input} placeholder="email@exemple.com"
              placeholderTextColor="#666" value={emailAddress}
              onChangeText={setEmailAddress} keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        </View>

        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <View style={styles.channelInfo}>
              <Link size={20} color={colors.textMuted} />
              <Text style={styles.channelName}>Webhook</Text>
            </View>
            <Switch
              value={webhookEnabled} onValueChange={setWebhookEnabled}
              trackColor={{ false: "#333", true: "#2563eb" }} thumbColor="#fff"
            />
          </View>
          {webhookEnabled && (
            <TextInput
              style={styles.input} placeholder="https://hooks.exemple.com/..."
              placeholderTextColor="#666" value={webhookUrl}
              onChangeText={setWebhookUrl} keyboardType="url" autoCapitalize="none"
            />
          )}
        </View>

        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <View style={styles.channelInfo}>
              <Bell size={20} color={colors.textMuted} />
              <Text style={styles.channelName}>In-App</Text>
            </View>
            <Switch
              value={inAppEnabled} onValueChange={setInAppEnabled}
              trackColor={{ false: "#333", true: "#2563eb" }} thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Sauvegarder</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique ({logs.total})</Text>
        {logs.data.length === 0 ? (
          <View style={styles.emptyLogs}>
            <BellOff size={40} color={colors.border} />
            <Text style={styles.emptyLogsText}>Aucune notification envoyee</Text>
          </View>
        ) : (
          logs.data.map(log => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={[styles.logSeverity, { backgroundColor: severityColor[log.alert.severity] ?? "#6b7280" }]}>
                  <Text style={styles.logSeverityText}>{log.alert.severity}</Text>
                </View>
                <Text style={[styles.logStatus, { color: statusColor[log.status] ?? "#888" }]}>{log.status}</Text>
              </View>
              <Text style={styles.logTitle} numberOfLines={1}>{log.alert.title}</Text>
              <View style={styles.logMeta}>
                <Text style={styles.logMetaText}>{channelLabel[log.channel] ?? log.channel}</Text>
                <Text style={styles.logMetaDot}>·</Text>
                <Text style={styles.logMetaText} numberOfLines={1}>{log.recipient}</Text>
              </View>
              <Text style={styles.logDate}>
                {new Date(log.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </Text>
              {log.error && <Text style={styles.logError}>{log.error}</Text>}
            </View>
          ))
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  loadingText: { color: "#888", marginTop: 12, fontSize: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", color: "#ededed" },
  testBtn: { backgroundColor: "#6b7280", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  testBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  section: { padding: 20, paddingTop: 0, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  channelCard: { backgroundColor: "#111", padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#333", marginBottom: 10 },
  channelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  channelInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  channelName: { fontSize: 15, fontWeight: "500", color: "#ededed" },
  input: { marginTop: 10, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: "#333", backgroundColor: "#0a0a0a", color: "#ededed", fontSize: 14 },
  saveBtn: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  emptyLogs: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyLogsText: { color: "#666", fontSize: 14 },
  logCard: { backgroundColor: "#111", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#333", marginBottom: 8 },
  logHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  logSeverity: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  logSeverityText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  logStatus: { fontSize: 12, fontWeight: "600" },
  logTitle: { fontSize: 14, fontWeight: "500", color: "#ededed", marginBottom: 4 },
  logMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  logMetaText: { fontSize: 12, color: "#888" },
  logMetaDot: { color: "#555" },
  logDate: { fontSize: 11, color: "#666" },
  logError: { fontSize: 11, color: "#ef4444", marginTop: 4 },
});
