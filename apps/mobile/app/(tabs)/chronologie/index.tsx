import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchTimeline, type TimelineEventDto } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Clock, DoorOpen, AlertTriangle, Shield, Info, ChevronRight, RefreshCw } from "lucide-react-native";

const EVENT_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  access: { icon: <Shield size={16} color="#06b6d4" />, color: "#06b6d4" },
  door: { icon: <DoorOpen size={16} color="#f59e0b" />, color: "#f59e0b" },
  alert: { icon: <AlertTriangle size={16} color="#ef4444" />, color: "#ef4444" },
  system: { icon: <Info size={16} color="#6b7280" />, color: "#6b7280" },
};

const EVENT_LABELS: Record<string, string> = {
  access: "chronologie.accessEvent",
  door: "chronologie.doorEvent",
  alert: "chronologie.alertEvent",
  system: "chronologie.systemEvent",
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function isToday(ts: string): boolean {
  const d = new Date(ts);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function isYesterday(ts: string): boolean {
  const d = new Date(ts);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
}

function getGroupLabel(ts: string, t: (key: string) => string): string {
  if (isToday(ts)) return t("chronologie.groupToday");
  if (isYesterday(ts)) return t("chronologie.groupYesterday");
  return formatDate(ts);
}

interface GroupedSection {
  title: string;
  data: TimelineEventDto[];
}

export default function ChronologieScreen() {
  const { t } = useTranslation();
  const [sections, setSections] = useState<GroupedSection[]>([]);
  const [events, setEvents] = useState<TimelineEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchTimeline({ limit: 50 });
      const data = result.data || [];
      setEvents(data);

      const groups: Record<string, TimelineEventDto[]> = {};
      for (const evt of data) {
        const label = getGroupLabel(evt.timestamp, t);
        if (!groups[label]) groups[label] = [];
        groups[label].push(evt);
      }
      setSections(Object.entries(groups).map(([title, data]) => ({ title, data })));
    } catch (e) {
      setError(t("chronologie.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const refresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const showDetail = (evt: TimelineEventDto) => {
    Alert.alert(
      evt.summary,
      `${t("chronologie.source")}: ${evt.doorName || "—"}\n${t("chronologie.timestamp")}: ${formatTime(evt.timestamp)} ${formatDate(evt.timestamp)}\n${evt.detail || ""}`,
    );
  };

  if (loading && events.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Clock size={20} color={colors.primary} />
        <Text style={styles.title}>{t("chronologie.title")}</Text>
        <Text style={styles.countText}>{events.length}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh}>
            <RefreshCw size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <FlashList
        data={sections}
        renderItem={({ item: section }) => (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.data.map(evt => {
              const iconInfo = EVENT_ICONS[evt.eventType] || EVENT_ICONS.system;
              return (
                <TouchableOpacity key={evt.eventId} style={styles.card} onPress={() => showDetail(evt)}>
                  <View style={[styles.iconWrap, { backgroundColor: iconInfo.color + "20" }]}>
                    {iconInfo.icon}
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.summary} numberOfLines={2}>{evt.summary}</Text>
                    <Text style={styles.eventMeta}>
                      {t(EVENT_LABELS[evt.eventType] || "chronologie.systemEvent")} · {evt.doorName || "—"}
                    </Text>
                    <Text style={styles.timestamp}>{formatTime(evt.timestamp)}</Text>
                  </View>
                  <ChevronRight size={14} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        estimatedItemSize={200}
        keyExtractor={(item, idx) => item.title + idx}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Clock size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("chronologie.empty")}</Text>
          </View>
        }
        ListFooterComponent={() => <View style={{ height: 24 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  headerBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.h2, flex: 1 },
  countText: { ...typography.caption, fontWeight: "600" },
  scroll: { padding: spacing.md },
  errorBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md, marginBottom: spacing.sm },
  errorText: { ...typography.caption, color: colors.destructive, flex: 1 },
  sectionBlock: { marginBottom: spacing.md },
  sectionHeader: { ...typography.label, fontSize: 13, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, marginBottom: spacing.xs },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  cardContent: { flex: 1 },
  summary: { ...typography.body, fontWeight: "500", fontSize: 14 },
  eventMeta: { ...typography.small, marginTop: 2 },
  timestamp: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
});
