import { View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ShareLinkReceiver } from "@/components/share-link-receiver";
import { colors } from "@/lib/theme";

export default function ShareLinkPage() {
  const { token } = useLocalSearchParams<{ token: string }>();

  return (
    <View style={styles.container}>
      <ShareLinkReceiver token={token || ""} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
