import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Search, DoorOpen } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { DoorControlCard } from "@/components/door-control-card";
import { fetchCameras } from "@/lib/api";
import type { CameraItem } from "@/lib/api";

interface DoorItem {
  id: string;
  name: string;
  state: string;
}

export default function DoorControlScreen() {
  const router = useRouter();
  const [doors, setDoors] = useState<DoorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadDoors = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const result = await fetchCameras({ limit: 200 });
      // Map cameras to door items (doors are represented as cameras for now)
      const doorList: DoorItem[] = (result.data || []).map((cam: CameraItem) => ({
        id: cam.id,
        name: cam.name,
        state: cam.status === "ONLINE" ? "open" : cam.status === "OFFLINE" ? "locked" : "closed",
      }));
      setDoors(doorList);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDoors();
    }, [loadDoors])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDoors(true);
  }, [loadDoors]);

  const handleStateChange = useCallback((doorId: string, newState: string) => {
    setDoors((prev) =>
      prev.map((d) => (d.id === doorId ? { ...d, state: newState } : d))
    );
  }, []);

  const filteredDoors = search
    ? doors.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
      )
    : doors;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une porte..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <Text style={styles.bodyText}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.bodyText}>{error}</Text>
        </View>
      ) : filteredDoors.length === 0 ? (
        <View style={styles.centerContent}>
          <DoorOpen size={48} color={colors.textMuted} />
          <Text style={styles.bodyText}>
            {search ? "Aucune porte trouvée" : "Aucune porte disponible"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDoors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DoorControlCard
              doorId={item.id}
              doorName={item.name}
              currentState={item.state}
              onStateChange={handleStateChange}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  searchContainer: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  list: {
    padding: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
