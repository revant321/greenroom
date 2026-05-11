import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateShow } from "@/services/showService";

export default function NewShow() {
  const router = useRouter();
  const create = useCreateShow();
  const [name, setName] = useState("");

  async function onSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync({ name: trimmed, roles: [] });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't add show", e?.message ?? String(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Show name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Rent"
        autoFocus
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <View style={styles.row}>
        <Pressable style={styles.cancel} onPress={() => router.back()}>
          <Text>Cancel</Text>
        </Pressable>
        <Pressable style={styles.save} onPress={onSave} disabled={create.isPending}>
          <Text style={styles.saveText}>{create.isPending ? "Saving…" : "Save"}</Text>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
  cancel: { padding: 12 },
  save: { padding: 12, backgroundColor: "#007AFF", borderRadius: 8, paddingHorizontal: 20 },
  saveText: { color: "#fff", fontWeight: "600" },
});
