import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useCreateSong } from "@/services/songService";
import { SongCategory } from "@/lib/types";

export default function NewSong() {
  const router = useRouter();
  const create = useCreateSong();
  const [title, setTitle] = useState("");
  const [isAudition, setIsAudition] = useState(false);
  const [category, setCategory] = useState<Exclude<SongCategory, null> | null>(
    null,
  );

  async function onSave() {
    const t = title.trim();
    if (!t) return;
    try {
      await create.mutateAsync({
        title: t,
        is_audition_song: isAudition,
        category,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? String(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        autoFocus
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <View style={styles.row}>
        <Text style={styles.label}>Audition song</Text>
        <Switch value={isAudition} onValueChange={setIsAudition} />
      </View>
      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {(["vocal", "guitar"] as const).map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(category === c ? null : c)}
            style={[styles.chip, category === c && styles.chipActive]}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
              {c}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.cancel} onPress={() => router.back()}>
          <Text>Cancel</Text>
        </Pressable>
        <Pressable style={styles.save} onPress={onSave} disabled={create.isPending}>
          <Text style={styles.saveText}>
            {create.isPending ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  label: { fontSize: 14, color: "#666" },
  input: {
    fontSize: 18,
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#eee",
  },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { color: "#333" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 24 },
  cancel: { padding: 12 },
  save: {
    padding: 12,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  saveText: { color: "#fff", fontWeight: "600" },
});
