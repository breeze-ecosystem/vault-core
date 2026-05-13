import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { Redirect } from "expo-router";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: "📊",
    cameras: "📹",
    alerts: "🔔",
    sites: "📍",
    settings: "⚙️",
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[name] ?? "📋"}
    </Text>
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
          title: "Cameras",
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
        name="sites"
        options={{
          title: "Sites",
          tabBarIcon: ({ focused }) => <TabIcon name="sites" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Parametres",
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
