import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView, ActivityIndicator } from "react-native";
import Constants from "expo-constants";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { updatePassword } from "@/lib/api";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const envLabel = process.env.EXPO_PUBLIC_API_URL?.includes("digitsoftafrica")
    ? "Production" : "Développement";

  async function handleLogout() {
    Alert.alert("Deconnexion", "Voulez-vous vous deconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Deconnexion",
        style: "destructive",
        onPress: async () => {
          setLogoutLoading(true);
          try { await logout(); router.replace("/login"); }
          finally { setLogoutLoading(false); }
        },
      },
    ]);
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Erreur", "Le nouveau mot de passe doit contenir au moins 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }
    setPasswordLoading(true);
    try {
      await updatePassword(user!.id, currentPassword, newPassword);
      Alert.alert("Succes", "Mot de passe modifie avec succes");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible de modifier le mot de passe");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
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
          <Text style={styles.infoValue}>{Constants.expoConfig?.version ?? "1.0.0"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Environnement</Text>
          <Text style={styles.infoValue}>{envLabel}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Statut</Text>
          <Text style={styles.infoValue}>{envLabel === "Production" ? "En ligne" : "Developpement"}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parametres</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/notifications")}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={22} color="#888" />
            <Text style={styles.menuItemLabel}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordForm(!showPasswordForm)}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="lock-closed-outline" size={22} color="#888" />
            <Text style={styles.menuItemLabel}>Changer le mot de passe</Text>
          </View>
          <Ionicons name={showPasswordForm ? "chevron-up" : "chevron-down"} size={20} color="#555" />
        </TouchableOpacity>

        {showPasswordForm && (
          <View style={styles.passwordForm}>
            <TextInput
              style={styles.input} placeholder="Mot de passe actuel" placeholderTextColor="#888"
              value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry
              accessibilityLabel="Mot de passe actuel"
            />
            <TextInput
              style={styles.input} placeholder="Nouveau mot de passe" placeholderTextColor="#888"
              value={newPassword} onChangeText={setNewPassword} secureTextEntry
              accessibilityLabel="Nouveau mot de passe (min 8 caracteres)"
            />
            <TextInput
              style={styles.input} placeholder="Confirmer le mot de passe" placeholderTextColor="#888"
              value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry
              accessibilityLabel="Confirmer le nouveau mot de passe"
            />
            <TouchableOpacity
              style={[styles.savePwdBtn, passwordLoading && styles.savePwdBtnDisabled]}
              onPress={handleChangePassword} disabled={passwordLoading}
            >
              {passwordLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.savePwdText}>Modifier le mot de passe</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={logoutLoading}>
        {logoutLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.logoutText}>Deconnexion</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  section: { marginBottom: 30, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#888", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 },
  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#333" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "600", color: "#ededed" },
  profileEmail: { fontSize: 13, color: "#888", marginTop: 2 },
  profileRole: { fontSize: 12, color: "#2563eb", marginTop: 4, fontWeight: "500" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#222" },
  infoLabel: { fontSize: 15, color: "#ededed" },
  infoValue: { fontSize: 15, color: "#888" },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#222" },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuItemLabel: { fontSize: 16, color: "#ededed" },
  passwordForm: { marginTop: 12, gap: 10 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#333", backgroundColor: "#0a0a0a", color: "#ededed", fontSize: 15 },
  savePwdBtn: { padding: 12, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  savePwdBtnDisabled: { opacity: 0.7 },
  savePwdText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  logoutButton: { backgroundColor: "#dc2626", padding: 14, borderRadius: 8, alignItems: "center", marginHorizontal: 20 },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
