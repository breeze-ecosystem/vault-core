import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { Redirect } from "expo-router";

type TabName = "index" | "cameras" | "alerts" | "chat" | "sites" | "settings";

function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const icons: Record<TabName, keyof typeof Ionicons.glyphMap> = {
    index: "stats-chart",
    cameras: "videocam",
    alerts: "notifications",
    chat: "chatbubbles",
    sites: "location",
    settings: "settings",
  };
  return (
    <Ionicons name={icons[name]} size={22} color={focused ? "#2563eb" : "#888"} />
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" }}>
        <Text style={{ color: "#ededed" }}>Chargement...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#111" },
        headerTintColor: "#ededed",
        tabBarStyle: { backgroundColor: "#111", borderTopColor: "#333" },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#888",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil", headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} /> }} />
      <Tabs.Screen name="cameras" options={{ title: "Cameras", tabBarIcon: ({ focused }) => <TabIcon name="cameras" focused={focused} /> }} />
      <Tabs.Screen name="alerts" options={{ title: "Alertes", tabBarIcon: ({ focused }) => <TabIcon name="alerts" focused={focused} /> }} />
      <Tabs.Screen name="chat" options={{ title: "Chat IA", tabBarIcon: ({ focused }) => <TabIcon name="chat" focused={focused} /> }} />
      <Tabs.Screen name="sites" options={{ title: "Sites", tabBarIcon: ({ focused }) => <TabIcon name="sites" focused={focused} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Parametres", tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} /> }} />
    </Tabs>
  );
}
