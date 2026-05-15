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
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, radius, spacing, type } from "@/theme/tokens";

export default function NewSong() {
  const router = useRouter();
  const create = useCreateSong();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
        placeholderTextColor={colors.textMuted}
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
            <Text
              style={[
                styles.chipText,
                category === c && styles.chipTextActive,
              ]}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.footer}>
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
    container: {
      flex: 1,
      padding: spacing.xl,
      gap: spacing.md,
      backgroundColor: c.bg,
    },
    label: { ...type.label, color: c.textMuted },
    input: {
      fontSize: 18,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.card,
      color: c.text,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    chipRow: { flexDirection: "row", gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { color: c.text, textTransform: "capitalize" },
    chipTextActive: { color: "#fff", fontWeight: "600" },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.md,
      marginTop: spacing.xl,
    },
    cancel: { padding: spacing.md },
    save: {
      padding: spacing.md,
      paddingHorizontal: spacing.xl,
      backgroundColor: c.accent,
      borderRadius: radius.md,
    },
    saveText: { color: "#fff", fontWeight: "600" },
  });
}
