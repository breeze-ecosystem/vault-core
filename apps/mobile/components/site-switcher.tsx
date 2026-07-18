import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import type { Site } from "@/lib/api";

interface SiteSwitcherProps {
  sites: Site[];
  currentSiteId: string | null;
  onSiteChange: (siteId: string | null) => void;
  isLoading?: boolean;
}

export function SiteSwitcher({ sites, currentSiteId, onSiteChange, isLoading }: SiteSwitcherProps) {
  const [open, setOpen] = useState(false);
  const currentSite = sites.find((s) => s.id === currentSiteId);

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Text style={styles.triggerText} numberOfLines={1}>
              {currentSite?.name ?? "Tous les sites"}
            </Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sélectionner un site</Text>

            <ScrollView style={styles.list} bounces={false}>
              {/* "Tous les sites" option */}
              <TouchableOpacity
                style={[styles.row, currentSiteId === null && styles.rowActive]}
                onPress={() => {
                  onSiteChange(null);
                  setOpen(false);
                }}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.dot, currentSiteId === null && styles.dotActive]} />
                  <Text style={[styles.rowText, currentSiteId === null && styles.rowTextActive]}>
                    Tous les sites
                  </Text>
                </View>
                {currentSiteId === null && <View style={styles.checkmark} />}
              </TouchableOpacity>

              {sites.length === 0 && (
                <Text style={styles.emptyText}>Aucun site disponible</Text>
              )}

              {sites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={[styles.row, currentSiteId === site.id && styles.rowActive]}
                  onPress={() => {
                    onSiteChange(site.id);
                    setOpen(false);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.dot,
                        currentSiteId === site.id && styles.dotActive,
                        { backgroundColor: site.isActive ? colors.success : colors.destructive },
                      ]}
                    />
                    <View style={styles.rowInfo}>
                      <Text
                        style={[styles.rowText, currentSiteId === site.id && styles.rowTextActive]}
                      >
                        {site.name}
                      </Text>
                      <Text style={styles.rowSub}>
                        {site.city ?? "—"} · {site._count?.cameras ?? 0} caméra(s)
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: site.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }]}>
                    <Text style={[styles.statusText, { color: site.isActive ? "#22c55e" : "#ef4444" }]}>
                      {site.isActive ? "En ligne" : "Hors ligne"}
                    </Text>
                  </View>
                  {currentSiteId === site.id && <View style={styles.checkmark} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 200,
  },
  triggerText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.text,
    maxWidth: 140,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 40,
    maxHeight: "60%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...typography.heading,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  rowActive: {
    backgroundColor: colors.primary + "15",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  rowInfo: {
    flex: 1,
  },
  rowText: {
    ...typography.body,
    fontWeight: "500",
  },
  rowTextActive: {
    color: colors.primary,
  },
  rowSub: {
    ...typography.small,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  checkmark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
