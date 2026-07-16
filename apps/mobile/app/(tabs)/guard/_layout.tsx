import { Stack } from "expo-router";
import { colors } from "@repo/design";

export default function GuardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.dark.surface },
        headerTintColor: colors.dark.text,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Garde" }} />
      <Stack.Screen name="nfc-scan" options={{ title: "Scan NFC" }} />
      <Stack.Screen name="qr-checkin" options={{ title: "Check-in QR" }} />
      <Stack.Screen name="door-control" options={{ title: "Contrôle porte" }} />
    </Stack>
  );
}
