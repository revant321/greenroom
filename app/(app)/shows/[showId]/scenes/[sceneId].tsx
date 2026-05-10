import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useScene, useUpdateScene } from "@/services/sceneService";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

export default function SceneDetail() {
  const { sceneId } = useLocalSearchParams<{ sceneId: string }>();
  const { data, isLoading } = useScene(sceneId);
  const update = useUpdateScene();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [inScene, setInScene] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setName(data.name);
      setNotes(data.notes);
      setInScene(data.is_user_in_scene);
      setHydrated(true);
    }
  }, [data, hydrated]);

  useDebouncedSave(
    { name, notes, is_user_in_scene: inScene },
    800,
    (patch) => {
      if (!data) return;
      if (
        patch.name === data.name &&
        patch.notes === data.notes &&
        patch.is_user_in_scene === data.is_user_in_scene
      ) {
        return;
      }
      update.mutate({ id: data.id, patch });
    },
    hydrated,
  );

  if (isLoading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name || "Scene" }} />
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <View style={styles.row}>
        <Text style={styles.label}>I'm in this scene</Text>
        <Switch value={inScene} onValueChange={setInScene} />
      </View>
      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Blocking, cues, costume change…"
        style={[styles.input, styles.notes]}
      />
      <Text style={styles.saved}>
        {update.isPending
          ? "Saving…"
          : update.isError
            ? "Offline — will retry when you edit."
            : "Saved"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, color: "#666" },
  input: {
    fontSize: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  notes: { minHeight: 200, textAlignVertical: "top" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
  },
  saved: { fontSize: 12, color: "#999", marginTop: 4 },
});
