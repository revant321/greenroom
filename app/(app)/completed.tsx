import { FlatList, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useShows, useUpdateShow, useDeleteShow } from "@/services/showService";

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
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() =>
                update.mutate({
                  id: item.id,
                  patch: { is_completed: false, completed_at: null },
                })
              }
            >
              <Text>↩︎ Unarchive</Text>
            </Pressable>
            <Pressable onPress={() => del.mutate(item.id)}>
              <Text style={{ color: "#FF3B30" }}>Delete</Text>
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
});
