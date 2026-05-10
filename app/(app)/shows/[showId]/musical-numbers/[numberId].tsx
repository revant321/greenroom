import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  useMusicalNumber,
  useUpdateMusicalNumber,
} from "@/services/musicalNumberService";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

export default function MusicalNumberDetail() {
  const { numberId } = useLocalSearchParams<{ numberId: string }>();
  const { data, isLoading } = useMusicalNumber(numberId);
  const update = useUpdateMusicalNumber();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setName(data.name);
      setNotes(data.notes);
      setHydrated(true);
    }
  }, [data, hydrated]);

  useDebouncedSave(
    { name, notes },
    800,
    ({ name, notes }) => {
      if (!data) return;
      if (name === data.name && notes === data.notes) return;
      update.mutate({ id: data.id, patch: { name, notes } });
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
      <Stack.Screen options={{ title: name || "Musical Number" }} />
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Tempo, cues, reminders…"
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
  saved: { fontSize: 12, color: "#999", marginTop: 4 },
});
