import { View, StyleSheet } from "react-native";
import { EventTimelineScreen } from "@/components/event-timeline-screen";
import { colors } from "@/lib/theme";

export default function ChronologiePage() {
  return (
    <View style={styles.container}>
      <EventTimelineScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
