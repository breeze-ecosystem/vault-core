import { Stack } from "expo-router";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0a0a0a" },
            headerTintColor: "#ededed",
            contentStyle: { backgroundColor: "#0a0a0a" },
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ErrorBoundary>
  );
}
