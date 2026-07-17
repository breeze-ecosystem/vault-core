import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Pressable } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchUsers, createUser, updateUser, deleteUser, type UserProfile } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Users, Plus, Search, Shield, ShieldAlert, RefreshCw, ChevronRight } from "lucide-react-native";

const PAGE_SIZE = 20;
const ROLES = ["VIEWER", "OPERATOR", "SUPERVISOR", "ADMIN"];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "#ef4444",
  ADMIN: "#f97316",
  SUPERVISOR: "#06b6d4",
  OPERATOR: "#10b981",
  VIEWER: "#6b7280",
};

function getInitials(first: string, last: string): string {
  return `${(first || "?").charAt(0)}${(last || "?").charAt(0)}`.toUpperCase();
}

export default function UtilisateursScreen() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadUsers = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const result = await fetchUsers({ limit: PAGE_SIZE, page: pageNum });
      if (append) setUsers(prev => [...prev, ...result.data]);
      else setUsers(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (e) {
      setError(t("utilisateurs.loadingError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const refresh = async () => {
    setRefreshing(true);
    await loadUsers(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (loadingMore || users.length >= total) return;
    loadUsers(page + 1, true);
  };

  const handleInvite = () => {
    let email = "";
    let password = "";
    let role = "VIEWER";

    Alert.prompt(
      t("utilisateurs.inviteTitle"),
      t("utilisateurs.inviteEmail"),
      (value) => {
        email = value || "";
        Alert.prompt(
          t("utilisateurs.inviteTitle"),
          t("utilisateurs.invitePassword"),
          async (pw) => {
            password = pw || "Temp123!";
            try {
              const newUser = await createUser({
                email,
                password,
                firstName: email.split("@")[0] || "User",
                lastName: "New",
                role,
              });
              setUsers(prev => [newUser, ...prev]);
              Alert.alert(t("common.success"), `${newUser.firstName} ${newUser.lastName}`);
            } catch (e) {
              Alert.alert(t("common.error"), e instanceof Error ? e.message : t("utilisateurs.loadingError"));
            }
          },
        );
      },
    );
  };

  const handleLongPress = (user: UserProfile) => {
    Alert.alert(
      `${user.firstName} ${user.lastName}`,
      `${t("utilisateurs.email")}: ${user.email}\n${t("utilisateurs.role")}: ${user.role}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: user.isActive ? t("utilisateurs.suspend") : t("utilisateurs.invite"),
          onPress: async () => {
            try {
              await updateUser(user.id, { isActive: !user.isActive });
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
            } catch { Alert.alert(t("common.error"), t("utilisateurs.loadingError")); }
          },
        },
        {
          text: t("utilisateurs.delete"),
          style: "destructive",
          onPress: () => {
            Alert.alert(t("utilisateurs.delete"), t("utilisateurs.deleteConfirm"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("utilisateurs.delete"),
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteUser(user.id);
                    setUsers(prev => prev.filter(u => u.id !== user.id));
                  } catch { Alert.alert(t("common.error"), t("utilisateurs.loadingError")); }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  const filteredUsers = searchQuery
    ? users.filter(u =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : users;

  if (loading && users.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Shield size={20} color={colors.primary} />
        <Text style={styles.title}>{t("utilisateurs.title")}</Text>
        <TouchableOpacity onPress={handleInvite} style={styles.inviteBtn}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("utilisateurs.search")}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh}>
            <RefreshCw size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <FlashList
        data={filteredUsers}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onLongPress={() => handleLongPress(item)}>
            <View style={[styles.avatar, { backgroundColor: (ROLE_COLORS[item.role] || colors.textMuted) + "20" }]}>
              <Text style={[styles.avatarText, { color: ROLE_COLORS[item.role] || colors.textMuted }]}>
                {getInitials(item.firstName, item.lastName)}
              </Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <View style={styles.cardBottom}>
                <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[item.role] || colors.textMuted) + "20" }]}>
                  <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] || colors.textMuted }]}>
                    {t(`utilisateurs.roles.${item.role}` as any) || item.role}
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: item.isActive ? "#22c55e" : "#ef4444" }]} />
              </View>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        )}
        estimatedItemSize={90}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Users size={40} color={colors.border} />
            <Text style={styles.emptyText}>{t("utilisateurs.empty")}</Text>
          </View>
        }
        ListFooterComponent={
          users.length < total ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadMoreText}>{t("common.loading")}</Text>}
            </TouchableOpacity>
          ) : <View style={{ height: 24 }} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  headerBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.h2, flex: 1 },
  inviteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  searchInput: { flex: 1, paddingVertical: spacing.sm, color: colors.text, fontSize: 14 },
  scroll: { padding: spacing.lg, paddingTop: spacing.sm },
  errorBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md },
  errorText: { ...typography.caption, color: colors.destructive, flex: 1 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  avatarText: { fontSize: 16, fontWeight: "700" },
  cardContent: { flex: 1 },
  userName: { ...typography.body, fontWeight: "600" },
  userEmail: { ...typography.small, marginBottom: 4 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 10, fontWeight: "600" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
  loadMoreBtn: { padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: "center", marginTop: spacing.sm },
  loadMoreText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
