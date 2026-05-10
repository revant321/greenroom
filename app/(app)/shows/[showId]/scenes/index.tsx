import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useDeleteScene, useScenes } from "@/services/sceneService";

export default function Scenes() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useScenes(showId);
  const del = useDeleteScene();

  if (isLoading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>No scenes yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const grayed = !item.is_user_in_scene;
          return (
            <View style={[styles.card, grayed && styles.grayed]}>
              <Link
                href={`/(app)/shows/${showId}/scenes/${item.id}`}
                style={styles.nameLink}
              >
                <Text style={[styles.name, grayed && styles.nameGrayed]}>
                  {item.name}
                </Text>
              </Link>
              <Pressable onPress={() => del.mutate(item.id)} accessibilityLabel="Delete">
                <Text style={{ color: "#FF3B30" }}>Delete</Text>
              </Pressable>
            </View>
          );
        }}
      />
      <Pressable
        style={styles.fab}
        onPress={() => router.push(`/(app)/shows/${showId}/scenes/new`)}
        accessibilityLabel="Add scene"
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 32, alignItems: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  grayed: { backgroundColor: "#f5f5f5" },
  nameLink: { flex: 1 },
  name: { fontSize: 17, fontWeight: "500" },
  nameGrayed: { color: "#999" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  fabPlus: { color: "#fff", fontSize: 32, lineHeight: 32 },
});
