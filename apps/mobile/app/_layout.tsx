import { Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import * as Sentry from "@sentry/react-native";
import { AuthProvider } from "@/lib/auth-context";
import { SiteProvider } from "@/lib/site-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { I18nProvider } from "@/lib/i18n";
import { IS_CONFIG_VALID } from "@/lib/config";
import { Shield } from "lucide-react-native";
import { colors } from "@repo/design";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: __DEV__ ? "development" : "production",
  enableNative: true,
});

function ConfigErrorScreen() {
  return (
    <View style={styles.configError}>
      <Shield size={40} color={colors.shared.destructive} />
      <Text style={styles.configErrorTitle}>Erreur de configuration</Text>
      <Text style={styles.configErrorMessage}>
        Les variables d'environnement EXPO_PUBLIC_API_URL et EXPO_PUBLIC_STREAM_URL
        doivent être définies dans le fichier .env, eas.json ou app.json extra.
      </Text>
    </View>
  );
}

export default Sentry.wrap(function RootLayout() {
  if (!IS_CONFIG_VALID) {
    return <ConfigErrorScreen />;
  }

  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <SiteProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.dark.surface },
            headerTintColor: colors.dark.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.dark.bg },
            animation: "slide_from_right",
            animationDuration: 250,
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="camera/[id]" options={{ title: "Caméra", headerBackTitle: "Retour" }} />
          <Stack.Screen name="alert/[id]" options={{ title: "Alerte", headerBackTitle: "Retour" }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications", headerBackTitle: "Paramètres" }} />
          <Stack.Screen name="visages/ajouter" options={{ title: "Ajouter un visage", headerBackTitle: "Visages", presentation: "modal" }} />
          <Stack.Screen name="visages/enroler" options={{ title: "Enrôler un visage", headerBackTitle: "Visages", presentation: "modal" }} />
          <Stack.Screen name="visages/index" options={{ title: "Visages", headerBackTitle: "Retour" }} />
          <Stack.Screen name="partager/[token]" options={{ headerShown: false }} />
        </Stack>
          </SiteProvider>
      </AuthProvider>
    </I18nProvider>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  configError: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: colors.dark.bg, padding: 24,
  },
  configErrorTitle: {
    fontSize: 20, fontWeight: "700", color: colors.shared.destructive,
    marginTop: 16, marginBottom: 12,
  },
  configErrorMessage: {
    fontSize: 14, color: colors.dark.textSecondary, textAlign: "center",
    lineHeight: 20,
  },
});
