import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { GradientButton } from "./GradientButton";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, fonts, radius, spacing } from "@/theme/tokens";

/** "Add Link" form used inside a <Sheet> on song / musical-number details. */
export function AddUrlForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (v: { title: string; url: string }) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  return (
    <View style={{ gap: spacing.sm + 2 }}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://youtu.be/…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="url"
        style={styles.input}
      />
      <View style={styles.row}>
        <GradientButton label="Cancel" variant="quiet" onPress={onCancel} style={{ flex: 1 }} />
        <GradientButton
          label="Add Link"
          onPress={() => {
            if (url.trim()) onSave({ title: title.trim(), url: url.trim() });
          }}
          disabled={!url.trim()}
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    input: {
      fontSize: 16,
      fontFamily: fonts.regular,
      padding: spacing.lg - 2,
      borderRadius: radius.lg,
      backgroundColor: c.accentSoft,
      color: c.text,
    },
    row: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      marginTop: spacing.sm,
    },
  });
}
