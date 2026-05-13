import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchSites, type SiteItem } from "@/lib/api";
import { siteStatusColor } from "@/lib/constants";

export default function SitesScreen() {
  const router = useRouter();
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSites() {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchSites();
      setSites(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  async function refreshSites() {
    try {
      setRefreshing(true);
      setError(null);
      const result = await fetchSites();
      setSites(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadSites();
  }, []);

  function handleSitePress(site: SiteItem) {
    router.push(`/(tabs)/cameras?siteId=${site.id}`);
  }

  if (loading && sites.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Chargement des sites...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshSites} tintColor="#2563eb" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Sites</Text>
        <Text style={styles.subtitle}>{sites.length} site{sites.length !== 1 ? "s" : ""}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {sites.map((site) => {
        const cameraCount = site._count?.cameras ?? site.cameras?.length ?? 0;
        return (
          <TouchableOpacity key={site.id} style={styles.card} onPress={() => handleSitePress(site)} activeOpacity={0.7}>
            <View style={styles.cardRow}>
              <View style={[styles.statusDot, { backgroundColor: siteStatusColor(site.isActive) }]} />
              <View style={styles.cardContent}>
                <Text style={styles.siteName}>{site.name}</Text>
                {site.city && <Text style={styles.siteLocation}>{site.city}{site.country ? `, ${site.country}` : ""}</Text>}
                {site.address && <Text style={styles.siteAddress}>{site.address}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cameraCount}>
                <Ionicons name="videocam" size={12} color="#3b82f6" /> {cameraCount} caméra{cameraCount !== 1 ? "s" : ""}
              </Text>
              <Text style={[styles.statusText, { color: site.isActive ? "#22c55e" : "#6b7280" }]}>
                {site.isActive ? "Actif" : "Inactif"}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {!loading && !error && sites.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun site configure</Text>
          <Text style={styles.emptyHint}>
            Ajoutez des sites depuis le tableau de bord
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  loadingText: { color: "#888", marginTop: 12, fontSize: 14 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", color: "#ededed" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 2 },
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  errorText: { color: "#ef4444", fontSize: 14 },
  card: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  cardContent: { flex: 1 },
  siteName: { fontSize: 16, fontWeight: "600", color: "#ededed" },
  siteLocation: { fontSize: 13, color: "#888", marginTop: 2 },
  siteAddress: { fontSize: 12, color: "#666", marginTop: 1 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  cameraCount: { fontSize: 13, color: "#3b82f6", fontWeight: "500" },
  statusText: { fontSize: 13, fontWeight: "600" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
  emptyHint: { color: "#666", fontSize: 12, marginTop: 4 },
});
