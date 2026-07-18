import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { colors } from "@repo/design";
import { useRouter } from "expo-router";
import { useTranslation } from "@/lib/i18n";
import {
  MessageSquareText,
  MapPin,
  Settings,
  ChevronRight,
  Shield,
  BarChart3,
  Clock,
  Activity,
  Gauge,
  Users,
  Car,
  Bell,
} from "lucide-react-native";

function useMenuItems() {
  const { t } = useTranslation();
  return [
    {
      id: "acces", label: t("nav.acces"),
      icon: <Shield size={22} color={colors.dark.text} />,
      route: "/(tabs)/more/acces/index",
    },
    {
      id: "commandCenter", label: t("nav.commandCenter"),
      icon: <Activity size={22} color={colors.dark.text} />,
      route: "/(tabs)/more/command-center/index",
    },
    {
      id: "analytique", label: t("nav.analytique"),
      icon: <BarChart3 size={22} color={colors.dark.text} />,
      route: "/(tabs)/more/analytique/index",
    },
    {
      id: "chronologie", label: t("nav.chronologie"),
      icon: <Clock size={22} color={colors.dark.text} />,
      route: "/(tabs)/more/chronologie/index",
    },
    {
      id: "utilisateurs", label: t("nav.utilisateurs"),
      icon: <Users size={22} color={colors.dark.text} />,
      route: "/(tabs)/more/utilisateurs/index",
    },
    {
      id: "notifications", label: t("nav.notifications"),
      icon: <Bell size={22} color={colors.dark.text} />,
      route: "/(tabs)/more/notifications/index",
    },
    {
      id: "risque", label: t("nav.risque"),
      icon: <Gauge size={22} color={colors.dark.text} />,
      route: "/(tabs)/more/risque/index",
    },
    {
      id: "vehicules", label: t("nav.vehicules"),
      icon: <Car size={22} color={colors.dark.text} />,
      route: "/(tabs)/more/vehicules/index",
    },
    {
      id: "chat", label: t("nav.chat"),
      icon: <MessageSquareText size={22} color={colors.dark.text} />,
      route: "/(tabs)/more/chat",
    },
    { id: "separator-1", label: "", icon: <View />, route: "", separator: true },
    {
      id: "sites", label: t("nav.sites"),
      icon: <MapPin size={22} color={colors.dark.text} />,
      route: "/sites",
    },
    {
      id: "settings", label: t("nav.settings"),
      icon: <Settings size={22} color={colors.dark.text} />,
      route: "/settings",
    },

  ];
}

export default function MoreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const menuItems = useMenuItems();

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>{t("nav.more")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.menuList}>
          {menuItems.map((item) => {
            if ((item as any).separator) {
              return <View key={item.id} style={styles.separator} />;
            }
            return (
              <Pressable
                key={item.id}
                style={styles.menuRow}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.menuIcon}>{item.icon}</View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color={colors.dark.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  headerBar: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.dark.text,
  },
  scroll: { padding: 16 },
  menuList: {
    backgroundColor: colors.dark.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.dark.text,
  },
  separator: {
    height: 8,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  headerBar: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.dark.text,
  },
  scroll: { padding: 16 },
  menuList: {
    backgroundColor: colors.dark.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.dark.text,
  },
});
