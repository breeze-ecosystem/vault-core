import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    Alert.alert("Deconnexion", "Voulez-vous vous deconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Deconnexion",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profil</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileRole}>{user?.role}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Environnement</Text>
          <Text style={styles.infoValue}>Production</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Deconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "600", color: "#ededed" },
  profileEmail: { fontSize: 13, color: "#888", marginTop: 2 },
  profileRole: {
    fontSize: 12,
    color: "#2563eb",
    marginTop: 4,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  infoLabel: { fontSize: 15, color: "#ededed" },
  infoValue: { fontSize: 15, color: "#888" },
  logoutButton: {
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
