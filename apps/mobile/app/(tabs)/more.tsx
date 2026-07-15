import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { colors } from "@repo/design";
import { useRouter } from "expo-router";
import {
  MessageSquareText,
  MapPin,
  Settings,
  FileText,
  KeyRound,
  ChevronRight,
} from "lucide-react-native";

interface MoreMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
}

const menuItems: MoreMenuItem[] = [
  {
    id: "chat",
    label: "Chat IA",
    icon: <MessageSquareText size={22} color={colors.dark.text} />,
    route: "/chat",
  },
  {
    id: "sites",
    label: "Sites",
    icon: <MapPin size={22} color={colors.dark.text} />,
    route: "/sites",
  },
  {
    id: "settings",
    label: "Paramètres",
    icon: <Settings size={22} color={colors.dark.text} />,
    route: "/settings",
  },
  {
    id: "audit",
    label: "Audit",
    icon: <FileText size={22} color={colors.dark.text} />,
    route: "/audit",
  },
  {
    id: "licences",
    label: "Licences",
    icon: <KeyRound size={22} color={colors.dark.text} />,
    route: "/licences",
  },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Plus</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <Pressable
              key={item.id}
              style={styles.menuRow}
              onPress={() => router.push(item.route)}
            >
              <View style={styles.menuIcon}>{item.icon}</View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={18} color={colors.dark.textMuted} />
            </Pressable>
          ))}
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
});
