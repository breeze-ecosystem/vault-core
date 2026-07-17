import { Stack } from "expo-router";
import { colors } from "@repo/design";

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.dark.surface },
        headerTintColor: colors.dark.text,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="chat" options={{ title: "Chat IA" }} />
      <Stack.Screen name="acces/index" options={{ title: "Accès" }} />
      <Stack.Screen name="analytique/index" options={{ title: "Analytique" }} />
      <Stack.Screen name="chronologie/index" options={{ title: "Chronologie" }} />
      <Stack.Screen name="command-center/index" options={{ title: "Centre de commande" }} />
      <Stack.Screen name="gouvernance/index" options={{ title: "Gouvernance" }} />
      <Stack.Screen name="ia/index" options={{ title: "IA" }} />
      <Stack.Screen name="licences/index" options={{ title: "Licences" }} />
      <Stack.Screen name="risque/index" options={{ title: "Risque" }} />
      <Stack.Screen name="utilisateurs/index" options={{ title: "Utilisateurs" }} />
      <Stack.Screen name="vehicules/index" options={{ title: "Véhicules" }} />
      <Stack.Screen name="notifications/index" options={{ title: "Notifications" }} />
    </Stack>
  );
}
