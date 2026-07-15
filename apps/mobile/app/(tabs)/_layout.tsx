import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { Redirect } from "expo-router";
import {
  LayoutDashboard, Camera, AlertTriangle, MoreHorizontal,
} from "lucide-react-native";
import { colors } from "@repo/design";

type TabName = "index" | "cameras" | "incidents" | "more";

function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const size = 24;
  const color = focused ? colors.shared.primary : colors.dark.textMuted;
  const icons: Record<TabName, React.ReactNode> = {
    index: <LayoutDashboard size={size} color={color} />,
    cameras: <Camera size={size} color={color} />,
    incidents: <AlertTriangle size={size} color={color} />,
    more: <MoreHorizontal size={size} color={color} />,
  };
  return icons[name];
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.dark.bg }}>
        <Text style={{ color: colors.dark.textSecondary }}>Chargement...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.dark.surface,
          borderTopColor: colors.dark.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.shared.primary,
        tabBarInactiveTintColor: colors.dark.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cameras"
        options={{
          title: "Caméras",
          tabBarIcon: ({ focused }) => <TabIcon name="cameras" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="incidents"
        options={{
          title: "Incidents",
          tabBarIcon: ({ focused }) => <TabIcon name="incidents" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Plus",
          tabBarIcon: ({ focused }) => <TabIcon name="more" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
