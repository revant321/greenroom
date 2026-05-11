import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDeleteShow, useShows, useUpdateShow } from "@/services/showService";
import { confirm } from "@/utils/confirm";

export default function Completed() {
  const { data, isLoading } = useShows({ completed: true });
  const update = useUpdateShow();
  const del = useDeleteShow();

  if (isLoading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(s) => s.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text>No completed shows.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                update.mutate({
                  id: item.id,
                  patch: { is_completed: false, completed_at: null },
                })
              }
            >
              <Text style={styles.restore}>Restore</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                confirm(
                  "Delete permanently?",
                  `Removes “${item.name}” and every harmony, scene recording, dance video, and PDF associated with it. This can't be undone.`,
                  () => del.mutate(item.id),
                  "Delete forever",
                )
              }
            >
              <Text style={styles.deleteForever}>Delete forever</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 32, alignItems: "center" },
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
  name: { fontSize: 17, fontWeight: "500", flex: 1 },
  actions: { flexDirection: "row", gap: 16 },
  restore: { color: "#007AFF", fontWeight: "500" },
  deleteForever: { color: "#FF3B30", fontWeight: "500" },
});
