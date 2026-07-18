import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  AlertTriangle,
  Camera,
  User,
  Info,
} from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { searchEvents, exportClip, type TimelineEvent } from "@/lib/api-extensions";
import { severityColors } from "@/lib/constants";

type FilterType = "all" | "alert" | "motion" | "face" | "system";
type DateFilter = "today" | "yesterday" | "custom";

const EVENT_TYPE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  alert: { icon: <AlertTriangle size={14} color="#fff" />, color: severityColors.CRITICAL },
  motion: { icon: <Camera size={14} color="#fff" />, color: "#06b6d4" },
  face: { icon: <User size={14} color="#fff" />, color: "#10b981" },
  system: { icon: <Info size={14} color="#fff" />, color: "#6b7280" },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  all: "Tous",
  alert: "Alertes",
  motion: "Mouvement",
  face: "Visage",
  system: "Système",
};

interface GroupedSection {
  title: string;
  data: TimelineEvent[];
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function isToday(ts: string): boolean {
  const d = new Date(ts);
  const today = new Date();
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
}

function isYesterday(ts: string): boolean {
  const d = new Date(ts);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
}

function getGroupLabel(ts: string): string {
  if (isToday(ts)) return "Aujourd'hui";
  if (isYesterday(ts)) return "Hier";
  return formatDate(ts);
}

export function EventTimelineScreen() {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [sections, setSections] = useState<GroupedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [clipLoading, setClipLoading] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadEvents = useCallback(async () => {
    try {
      setError(null);

      const now = new Date();
      let from: string | undefined;
      if (dateFilter === "today") {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (dateFilter === "yesterday") {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
      }

      const params: Record<string, string> = { limit: "50" };
      if (from) params.from = from;
      if (filterType !== "all") params.eventType = filterType;

      const result = await searchEvents(params as any);
      const data = result.data || [];
      setEvents(data);
      setTotal(result.total);

      const groups: Record<string, TimelineEvent[]> = {};
      for (const evt of data) {
        const label = getGroupLabel(evt.timestamp);
        if (!groups[label]) groups[label] = [];
        groups[label].push(evt);
      }
      setSections(Object.entries(groups).map(([title, data]) => ({ title, data })));
    } catch (e) {
      setError("Erreur lors du chargement des événements");
    } finally {
      setLoading(false);
    }
  }, [filterType, dateFilter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const refresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const toggleExpand = (eventId: string) => {
    setExpandedEvent((prev) => prev === eventId ? null : eventId);
  };

  const handleExportClip = async (eventId: string) => {
    setClipLoading(eventId);
    try {
      const result = await exportClip(eventId);
      setClipLoading(null);
    } catch (e) {
      setClipLoading(null);
    }
  };

  const renderEventCard = useCallback(
    (evt: TimelineEvent) => {
      const isExpanded = expandedEvent === evt.id;
      const iconInfo = EVENT_TYPE_ICONS[evt.eventType] || EVENT_TYPE_ICONS.system;

      return (
        <TouchableOpacity
          key={evt.id}
          style={styles.eventCard}
          onPress={() => toggleExpand(evt.id)}
          activeOpacity={0.7}
        >
          <View style={styles.eventRow}>
            <View style={[styles.eventIcon, { backgroundColor: iconInfo.color + "20" }]}>
              {iconInfo.icon}
            </View>
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle} numberOfLines={2}>{evt.title}</Text>
              <Text style={styles.eventMeta}>
                {evt.cameraName} · {formatTime(evt.timestamp)}
              </Text>
            </View>
            <View style={styles.eventBadge}>
              {evt.severity && (
                <View style={[styles.severityDot, { backgroundColor: severityColors[evt.severity] || "#6b7280" }]} />
              )}
              {isExpanded ? (
                <ChevronUp size={16} color={colors.textMuted} />
              ) : (
                <ChevronDown size={16} color={colors.textMuted} />
              )}
            </View>
          </View>

          {/* Expanded detail */}
          {isExpanded && (
            <View style={styles.eventDetail}>
              {evt.snapshotUrl && (
                <View style={styles.snapshotPlaceholder}>
                  <Camera size={24} color={colors.textMuted} />
                  <Text style={styles.snapshotHint}>Instantané</Text>
                </View>
              )}
              {evt.description && (
                <Text style={styles.eventDescription}>{evt.description}</Text>
              )}
              <View style={styles.eventMetaRow}>
                <Text style={styles.metaLabel}>Type: {EVENT_TYPE_LABELS[evt.eventType] || evt.eventType}</Text>
                <Text style={styles.metaLabel}>Caméra: {evt.cameraName}</Text>
              </View>
              {evt.clipUrl ? (
                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={() => handleExportClip(evt.id)}
                  disabled={clipLoading === evt.id}
                >
                  {clipLoading === evt.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Download size={16} color="#fff" />
                      <Text style={styles.exportBtnText}>Télécharger le clip</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.clipUnavailable}>Clip vidéo non disponible</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [expandedEvent, clipLoading],
  );

  const filterChips: FilterType[] = ["all", "alert", "motion", "face", "system"];

  if (loading && events.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Chargement de la chronologie...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.dateSelector}>
          <Calendar size={16} color={colors.primary} />
          <TouchableOpacity
            style={[styles.dateChip, dateFilter === "today" && styles.dateChipActive]}
            onPress={() => setDateFilter("today")}
          >
            <Text style={[styles.dateChipText, dateFilter === "today" && styles.dateChipTextActive]}>
              Aujourd'hui
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateChip, dateFilter === "yesterday" && styles.dateChipActive]}
            onPress={() => setDateFilter("yesterday")}
          >
            <Text style={[styles.dateChipText, dateFilter === "yesterday" && styles.dateChipTextActive]}>
              Hier
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.typeFilterRow}>
          {filterChips.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeChip, filterType === type && styles.typeChipActive]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.typeChipText, filterType === type && styles.typeChipTextActive]}>
                {EVENT_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlashList
        data={sections}
        renderItem={({ item: section }) => (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.data.map(renderEventCard)}
          </View>
        )}
        keyExtractor={(item, idx) => item.title + idx}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Clock size={40} color={colors.border} />
            <Text style={styles.emptyTitle}>Aucun événement</Text>
            <Text style={styles.emptySubtitle}>Aucun événement dans cette période</Text>
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
  loadingText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  filterBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateChipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(6,182,212,0.1)",
  },
  dateChipText: { ...typography.label, fontSize: 12 },
  dateChipTextActive: { color: colors.primary },
  typeFilterRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: { ...typography.label, fontSize: 12 },
  typeChipTextActive: { color: "#fff" },
  listContent: { padding: spacing.md },
  errorBox: {
    margin: spacing.md,
    padding: spacing.sm,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: borderRadius.md,
  },
  errorText: { ...typography.caption, color: colors.destructive },
  sectionBlock: { marginBottom: spacing.md },
  sectionHeader: {
    ...typography.label,
    fontSize: 13,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  eventCard: {
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  eventContent: { flex: 1 },
  eventTitle: { ...typography.body, fontWeight: "500", fontSize: 14 },
  eventMeta: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  eventBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  eventDetail: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  snapshotPlaceholder: {
    height: 100,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
  },
  snapshotHint: { ...typography.small, color: colors.textMuted },
  eventDescription: { ...typography.body, color: colors.textSecondary },
  eventMetaRow: { gap: 2 },
  metaLabel: { ...typography.small, color: colors.textMuted },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  exportBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  clipUnavailable: { ...typography.small, color: colors.textMuted, fontStyle: "italic", textAlign: "center" },
  empty: { padding: 40, alignItems: "center" },
  emptyTitle: { ...typography.heading, color: colors.textSecondary, marginTop: spacing.md },
  emptySubtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },
});
