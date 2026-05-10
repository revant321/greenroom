import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  useMusicalNumber,
  useUpdateMusicalNumber,
} from "@/services/musicalNumberService";
import {
  useCreateHarmony,
  useDeleteHarmony,
  useHarmonies,
  useUpdateHarmony,
} from "@/services/harmonyService";
import { uploadMedia } from "@/services/mediaService";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { Harmony } from "@/lib/types";

export default function MusicalNumberDetail() {
  const { numberId } = useLocalSearchParams<{ numberId: string }>();
  const { data, isLoading } = useMusicalNumber(numberId);
  const update = useUpdateMusicalNumber();
  const { data: harmonies } = useHarmonies(numberId);
  const createHarmony = useCreateHarmony();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  async function onRecordingFinished(uri: string) {
    setRecorderOpen(false);
    if (!data) return;
    try {
      setUploading(true);
      const storagePath = await uploadMedia(uri, "harmonies", "m4a");
      await createHarmony.mutateAsync({
        musical_number_id: data.id,
        storage_path: storagePath,
      });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Harmonies</Text>
          <Pressable
            onPress={() => setRecorderOpen(true)}
            style={styles.addBtn}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>{uploading ? "Uploading…" : "+ Record"}</Text>
          </Pressable>
        </View>

        <FlatList
          data={harmonies ?? []}
          keyExtractor={(h) => h.id}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No harmonies yet. Tap + Record.</Text>
          }
          renderItem={({ item }) => <HarmonyRow item={item} />}
        />
      </View>

      <Modal visible={recorderOpen} animationType="slide" presentationStyle="pageSheet">
        <AudioRecorder
          onFinish={onRecordingFinished}
          onCancel={() => setRecorderOpen(false)}
        />
      </Modal>
    </ScrollView>
  );
}

function HarmonyRow({ item }: { item: Harmony }) {
  const update = useUpdateHarmony();
  const del = useDeleteHarmony();
  const [measure, setMeasure] = useState<string>(
    item.measure_number?.toString() ?? "",
  );
  const [caption, setCaption] = useState(item.caption);

  useDebouncedSave({ measure, caption }, 800, ({ measure, caption }) => {
    const trimmed = measure.trim();
    const mNum = trimmed === "" ? null : Number(trimmed);
    if (mNum !== null && Number.isNaN(mNum)) return;
    if (mNum === item.measure_number && caption === item.caption) return;
    update.mutate({ id: item.id, patch: { measure_number: mNum, caption } });
  });

  return (
    <View style={styles.harmonyRow}>
      <AudioPlayer storagePath={item.storage_path} />
      <View style={styles.harmonyFields}>
        <TextInput
          value={measure}
          onChangeText={setMeasure}
          placeholder="Measure #"
          keyboardType="number-pad"
          style={[styles.smallInput, { width: 100 }]}
        />
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Caption"
          style={[styles.smallInput, { flex: 1 }]}
        />
      </View>
      <Pressable onPress={() => del.mutate(item)} style={styles.deleteBtn}>
        <Text style={{ color: "#FF3B30" }}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
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
  notes: { minHeight: 120, textAlignVertical: "top" },
  saved: { fontSize: 12, color: "#999", marginTop: 4 },
  section: { marginTop: 24 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 20, fontWeight: "600" },
  addBtn: {
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "600" },
  empty: { color: "#999", padding: 8 },
  harmonyRow: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    gap: 6,
  },
  harmonyFields: { flexDirection: "row", gap: 8 },
  smallInput: {
    padding: 8,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  deleteBtn: { alignSelf: "flex-end" },
});
