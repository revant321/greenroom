import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { useShows, useCompleteShow, useDeleteShow } from "@/services/showService";
import { Show } from "@/lib/types";
import { confirm } from "@/utils/confirm";

export default function Home() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useShows({ completed: false });
  const complete = useCompleteShow();
  const del = useDeleteShow();

  if (isLoading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text>Couldn't load shows.</Text>
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
        ListHeaderComponent={
          <Link href="/(app)/songs" style={styles.songsLink}>
            Songs →
          </Link>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No shows yet</Text>
            <Text style={styles.emptyBody}>Tap “+” to add your first show.</Text>
          </View>
        }
        renderItem={({ item }: { item: Show }) => (
          <View style={styles.card}>
            <Link href={`/(app)/shows/${item.id}`} style={styles.nameLink}>
              <Text style={styles.name}>{item.name}</Text>
            </Link>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => complete.mutate(item.id)} accessibilityLabel="Mark complete">
                <Text style={styles.action}>✓</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  confirm(
                    "Delete forever?",
                    `Removes “${item.name}” and every harmony, scene recording, dance video, and PDF inside it.`,
                    () => del.mutate(item.id),
                  )
                }
                accessibilityLabel="Delete show"
              >
                <Text style={[styles.action, { color: "#FF3B30" }]}>🗑</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/(app)/shows/new")}
        accessibilityLabel="Add show"
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  emptyBody: { color: "#666" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  songsLink: { fontSize: 16, color: "#007AFF", padding: 12, marginBottom: 8 },
  nameLink: { flex: 1 },
  name: { fontSize: 17, fontWeight: "500" },
  action: { fontSize: 20, padding: 4 },
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
