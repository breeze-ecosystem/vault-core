import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView, ActivityIndicator } from "react-native";
import Constants from "expo-constants";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { updatePassword } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { colors } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Bell, ChevronRight, Lock, ChevronUp, ChevronDown, Building2 } from "lucide-react-native";
import { OrgSwitcher } from "@/components/org-switcher";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, organization, logout } = useAuth();
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const envLabel = API_URL.includes("digitsoftafrica")
    ? t("settings.production") : t("settings.development");

  async function handleLogout() {
    Alert.alert(t("settings.logoutTitle"), t("settings.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
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
      Alert.alert(t("common.error"), t("settings.fillAllFields"));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t("common.error"), t("settings.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("common.error"), t("settings.passwordsMismatch"));
      return;
    }
    setPasswordLoading(true);
    try {
      if (!user?.id) return;
      await updatePassword(user.id, currentPassword, newPassword);
      Alert.alert(t("common.success"), t("settings.passwordChanged"));
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("settings.passwordChangeError"));
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.profile")}</Text>
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
        {organization && (
          <View style={styles.orgRow}>
            <View style={styles.orgInfo}>
              <Building2 size={18} color={colors.primary} />
              <Text style={styles.orgName}>{organization.name}</Text>
            </View>
            <OrgSwitcher />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.application")}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t("settings.version")}</Text>
          <Text style={styles.infoValue}>{Constants.expoConfig?.version ?? "1.0.0"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t("settings.environment")}</Text>
          <Text style={styles.infoValue}>{envLabel}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t("settings.status")}</Text>
          <Text style={styles.infoValue}>{envLabel === t("settings.production") ? t("settings.online") : t("settings.development")}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.title")}</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/notifications")}>
          <View style={styles.menuItemLeft}>
            <Bell size={22} color={colors.textMuted} />
            <Text style={styles.menuItemLabel}>{t("settings.notifications")}</Text>
          </View>
          <ChevronRight size={20} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordForm(!showPasswordForm)}>
          <View style={styles.menuItemLeft}>
            <Lock size={22} color={colors.textMuted} />
            <Text style={styles.menuItemLabel}>{t("settings.changePassword")}</Text>
          </View>
          {showPasswordForm ? <ChevronUp size={20} color="#555" /> : <ChevronDown size={20} color="#555" />}
        </TouchableOpacity>

        {showPasswordForm && (
          <View style={styles.passwordForm}>
            <TextInput
              style={styles.input} placeholder={t("settings.currentPassword")} placeholderTextColor="#888"
              value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry
              accessibilityLabel={t("settings.currentPassword")}
            />
            <TextInput
              style={styles.input} placeholder={t("settings.newPassword")} placeholderTextColor="#888"
              value={newPassword} onChangeText={setNewPassword} secureTextEntry
              accessibilityLabel={t("settings.newPasswordMinLength")}
            />
            <TextInput
              style={styles.input} placeholder={t("settings.confirmPassword")} placeholderTextColor="#888"
              value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry
              accessibilityLabel={t("settings.confirmPassword")}
            />
            <TouchableOpacity
              style={[styles.savePwdBtn, passwordLoading && styles.savePwdBtnDisabled]}
              onPress={handleChangePassword} disabled={passwordLoading}
            >
              {passwordLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.savePwdText}>{t("settings.modifyPassword")}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={logoutLoading}>
        {logoutLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.logoutText}>{t("settings.logout")}</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { marginBottom: 30, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 },
  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "600", color: colors.text },
  profileEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  profileRole: { fontSize: 12, color: colors.primary, marginTop: 4, fontWeight: "500" },
  orgRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 4 },
  orgInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  orgName: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 15, color: colors.text },
  infoValue: { fontSize: 15, color: colors.textMuted },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuItemLabel: { fontSize: 16, color: colors.text },
  passwordForm: { marginTop: 12, gap: 10 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, color: colors.text, fontSize: 15 },
  savePwdBtn: { padding: 12, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center" },
  savePwdBtnDisabled: { opacity: 0.7 },
  savePwdText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  logoutButton: { backgroundColor: colors.destructive, padding: 14, borderRadius: 8, alignItems: "center", marginHorizontal: 20 },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
