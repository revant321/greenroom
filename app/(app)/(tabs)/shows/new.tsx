import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateShow } from "@/services/showService";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, radius, spacing, type } from "@/theme/tokens";

export default function NewShow() {
  const router = useRouter();
  const create = useCreateShow();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
        placeholderTextColor={colors.textMuted}
        autoFocus
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <View style={styles.row}>
        <Pressable style={styles.cancel} onPress={() => router.back()}>
          <Text style={{ color: colors.text }}>Cancel</Text>
        </Pressable>
        <Pressable
          style={styles.save}
          onPress={onSave}
          disabled={create.isPending}
        >
          <Text style={styles.saveText}>
            {create.isPending ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: c.bg },
    label: { ...type.label, color: c.textMuted },
    input: {
      fontSize: 18,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: radius.md,
      backgroundColor: c.card,
      color: c.text,
    },
    row: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    cancel: { padding: spacing.md },
    save: {
      padding: spacing.md,
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
    },
    saveText: { color: "#fff", fontWeight: "600" },
  });
}
