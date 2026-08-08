import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCreateScene, useScenes } from "@/services/sceneService";
import { useTheme } from "@/theme/useTheme";
import { GradientButton } from "@/components/GradientButton";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { ColorTokens, fonts, radius, spacing } from "@/theme/tokens";

export default function NewScene() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const create = useCreateScene();
  const { data: existing } = useScenes(showId);
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [name, setName] = useState("");
  const [inScene, setInScene] = useState(true);

  async function onSave() {
    const trimmed = name.trim();
    if (!trimmed || !showId) return;
    const nextOrder = existing?.length ?? 0;
    try {
      await create.mutateAsync({
        show_id: showId,
        name: trimmed,
        order: nextOrder,
        is_user_in_scene: inScene,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't add", e?.message ?? String(e));
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Scene name"
        placeholderTextColor={colors.textMuted}
        autoFocus
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>I'm in this scene</Text>
        <AnimatedToggle value={inScene} onValueChange={setInScene} />
      </View>
      <View style={styles.row}>
        <GradientButton
          label="Cancel"
          variant="quiet"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <GradientButton
          label="Add Scene"
          onPress={onSave}
          loading={create.isPending}
          disabled={!name.trim()}
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
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.lg - 2,
      backgroundColor: c.card,
      borderRadius: radius.lg,
    },
    toggleLabel: {
      fontSize: 16,
      fontFamily: fonts.regular,
      color: c.text,
    },
    row: { flexDirection: "row", gap: spacing.sm + 2, marginTop: spacing.sm },
  });
}
