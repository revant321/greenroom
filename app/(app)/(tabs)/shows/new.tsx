import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateShow } from "@/services/showService";
import { useTheme } from "@/theme/useTheme";
import { GradientButton } from "@/components/GradientButton";
import { ColorTokens, fonts, radius, spacing } from "@/theme/tokens";

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
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Show title"
        placeholderTextColor={colors.textMuted}
        autoFocus
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <View style={styles.row}>
        <GradientButton
          label="Cancel"
          variant="quiet"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <GradientButton
          label="Add Show"
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
    row: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      marginTop: spacing.sm,
    },
  });
}
