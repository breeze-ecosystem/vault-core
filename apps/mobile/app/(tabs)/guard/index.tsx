import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  Nfc,
  QrCode,
  DoorOpen,
  ChevronRight,
} from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

const actions: QuickAction[] = [
  {
    id: "nfc",
    title: "Scan NFC",
    description: "Valider un badge d'accès par NFC",
    icon: <Nfc size={32} color="#06b6d4" />,
    route: "/guard/nfc-scan",
    color: "#06b6d4",
  },
  {
    id: "qr",
    title: "Check-in QR",
    description: "Scanner le QR code d'un visiteur",
    icon: <QrCode size={32} color="#10b981" />,
    route: "/guard/qr-checkin",
    color: "#10b981",
  },
  {
    id: "door",
    title: "Contrôle porte",
    description: "Ouvrir, fermer ou verrouiller une porte",
    icon: <DoorOpen size={32} color="#f59e0b" />,
    route: "/guard/door-control",
    color: "#f59e0b",
  },
];

export default function GuardIndexScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Garde</Text>
        <Text style={styles.subtitle}>Actions rapides</Text>
      </View>

      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.card}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: action.color + "20" },
              ]}
            >
              {action.icon}
            </View>
            <Text style={styles.cardTitle}>{action.title}</Text>
            <Text style={styles.cardDescription}>{action.description}</Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardAction, { color: action.color }]}>
                Ouvrir
              </Text>
              <ChevronRight size={16} color={action.color} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  cardAction: {
    ...typography.caption,
    fontWeight: "600",
  },
});
