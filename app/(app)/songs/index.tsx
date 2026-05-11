import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useDeleteSong, useSongs, SongFilter } from "@/services/songService";

const PRESETS: { label: string; filter: SongFilter }[] = [
  { label: "All", filter: {} },
  { label: "Audition", filter: { is_audition_song: true } },
  { label: "Vocal", filter: { category: "vocal" } },
  { label: "Guitar", filter: { category: "guitar" } },
  { label: "In progress", filter: { status: "in-progress" } },
  { label: "Completed", filter: { status: "completed" } },
];

export default function Songs() {
  const router = useRouter();
  const [preset, setPreset] = useState(0);
  const { data, isLoading } = useSongs(PRESETS[preset].filter);
  const del = useDeleteSong();

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filters}>
        {PRESETS.map((p, i) => (
          <Pressable
            key={p.label}
            onPress={() => setPreset(i)}
            style={[styles.chip, i === preset && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, i === preset && styles.chipTextActive]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {isLoading && !data ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <Text style={{ color: "#666", padding: 16 }}>
              No songs match this filter.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Link href={`/(app)/songs/${item.id}`} style={{ flex: 1 }}>
                <View>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {[
                      item.category,
                      item.status,
                      item.is_audition_song ? "audition" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              </Link>
              <Pressable onPress={() => del.mutate(item.id)}>
                <Text style={{ color: "#FF3B30" }}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
      <Pressable style={styles.fab} onPress={() => router.push("/(app)/songs/new")}>
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#eee",
  },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { color: "#333", fontSize: 14 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  title: { fontSize: 17, fontWeight: "500" },
  meta: { fontSize: 13, color: "#666", marginTop: 2 },
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
