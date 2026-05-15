import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { Redirect } from "expo-router";
import {
  LayoutDashboard, Camera, Bell, MessageSquareText, MapPin, Settings,
} from "lucide-react-native";
import { colors } from "@/lib/theme";

type TabName = "index" | "cameras" | "alerts" | "chat" | "sites" | "settings";

function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const size = 22;
  const color = focused ? colors.primary : colors.textMuted;
  const icons: Record<TabName, React.ReactNode> = {
    index: <LayoutDashboard size={size} color={color} />,
    cameras: <Camera size={size} color={color} />,
    alerts: <Bell size={size} color={color} />,
    chat: <MessageSquareText size={size} color={color} />,
    sites: <MapPin size={size} color={color} />,
    settings: <Settings size={size} color={color} />,
  };
  return icons[name];
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <Text style={{ color: colors.textSecondary }}>Chargement...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          headerShown: false,
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
        name="alerts"
        options={{
          title: "Alertes",
          tabBarIcon: ({ focused }) => <TabIcon name="alerts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat IA",
          tabBarIcon: ({ focused }) => <TabIcon name="chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sites"
        options={{
          title: "Sites",
          tabBarIcon: ({ focused }) => <TabIcon name="sites" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Paramètres",
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
