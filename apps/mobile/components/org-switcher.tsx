import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { Building2, Check } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function OrgSwitcher() {
  const { organization, organizations, switchOrganization } = useAuth();
  const [visible, setVisible] = useState(false);

  if (organizations.length <= 1) {
    return null;
  }

  async function handleSelect(orgId: string) {
    if (orgId === organization?.id) {
      setVisible(false);
      return;
    }
    await switchOrganization(orgId);
    setVisible(false);
  }

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        accessibilityLabel="Changer d'organisation"
        accessibilityRole="button"
      >
        <Building2 size={20} color={colors.text} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>Organisations</Text>
            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
            >
              {organizations.map((org) => {
                const isCurrent = org.id === organization?.id;
                return (
                  <TouchableOpacity
                    key={org.id}
                    style={styles.orgItem}
                    onPress={() => handleSelect(org.id)}
                    accessibilityLabel={`${org.name}${isCurrent ? " (actuelle)" : ""}`}
                    accessibilityRole="button"
                  >
                    <View style={styles.orgItemLeft}>
                      <Building2
                        size={20}
                        color={isCurrent ? colors.primary : colors.textMuted}
                      />
                      <View style={styles.orgItemInfo}>
                        <Text
                          style={[
                            styles.orgName,
                            isCurrent && styles.orgNameCurrent,
                          ]}
                        >
                          {org.name}
                        </Text>
                        <View style={styles.orgMeta}>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{org.role}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {isCurrent && (
                      <View style={styles.currentIndicator}>
                        <Check size={16} color={colors.primary} />
                        <Text style={styles.currentLabel}>(actuelle)</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: spacing.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },
  scrollArea: {
    maxHeight: SCREEN_HEIGHT * 0.5 - 100,
  },
  orgItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  orgItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  orgItemInfo: {
    flex: 1,
  },
  orgName: {
    ...typography.body,
    fontWeight: "500",
  },
  orgNameCurrent: {
    fontWeight: "700",
    color: colors.primary,
  },
  orgMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: colors.elevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    ...typography.small,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  currentIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  currentLabel: {
    ...typography.caption,
    color: colors.primary,
  },
});
