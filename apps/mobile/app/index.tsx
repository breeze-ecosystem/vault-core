import { Redirect } from "expo-router";
import { getAccessTokenAsync } from "@/lib/auth-storage";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    getAccessTokenAsync().then((token) => {
      setHasToken(!!token);
    });
  }, []);

  if (hasToken === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#0a0a0a" }}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (hasToken) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
