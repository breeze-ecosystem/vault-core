import { Redirect } from "expo-router";
import { getAccessTokenAsync } from "@/lib/auth-storage";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { colors } from "@/lib/theme";

export default function Index() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    getAccessTokenAsync()
      .then((token) => {
        if (mounted) setHasToken(!!token);
      })
      .catch(() => {
        if (mounted) setHasToken(false);
      });
    return () => { mounted = false; };
  }, []);

  if (hasToken === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (hasToken) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
