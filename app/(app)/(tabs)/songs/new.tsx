import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateSong } from "@/services/songService";
import { SongCategory } from "@/lib/types";
import { useTheme } from "@/theme/useTheme";
import { GradientButton } from "@/components/GradientButton";
import { Chip } from "@/components/Chip";
import { ColorTokens, fonts, radius, spacing } from "@/theme/tokens";

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
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Song title"
        placeholderTextColor={colors.textMuted}
        autoFocus
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <Text style={styles.sectionLabel}>CATEGORIES</Text>
      <View style={styles.chipRow}>
        <Chip
          label="Audition"
          active={isAudition}
          onPress={() => setIsAudition((v) => !v)}
        />
        {(["vocal", "guitar"] as const).map((c) => (
          <Chip
            key={c}
            label={c[0].toUpperCase() + c.slice(1)}
            active={category === c}
            onPress={() => setCategory(category === c ? null : c)}
          />
        ))}
      </View>
      <View style={styles.footer}>
        <GradientButton
          label="Cancel"
          variant="quiet"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <GradientButton
          label="Add Song"
          onPress={onSave}
          loading={create.isPending}
          disabled={!title.trim()}
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.lg + 4,
      gap: spacing.md,
      backgroundColor: c.bg,
    },
    input: {
      fontSize: 16,
      fontFamily: fonts.regular,
      padding: spacing.lg - 2,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      color: c.text,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: fonts.bold,
      fontWeight: "700",
      letterSpacing: 0.9,
      color: c.textMuted,
      marginTop: spacing.xs,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    footer: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      marginTop: spacing.lg,
    },
  });
}
