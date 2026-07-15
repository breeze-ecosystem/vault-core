import { View, Text, StyleSheet } from "react-native";
import { colors, typography } from "@repo/design";
import { AlertTriangle } from "lucide-react-native";

export default function IncidentsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Incidents</Text>
      </View>
      <View style={styles.content}>
        <AlertTriangle size={48} color={colors.dark.textMuted} />
        <Text style={styles.heading}>Incidents</Text>
        <Text style={styles.body}>
          Les incidents capturés hors ligne apparaîtront ici. Fonctionnalité
          complète prévue dans une mise à jour ultérieure.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  headerBar: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.dark.text,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.dark.text,
  },
  body: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
