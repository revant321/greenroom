import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, type } from "@/theme/tokens";
import { GradientButton } from "./GradientButton";

type Props = {
  icon?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Prototype empty state: dashed rounded frame, quiet voice. */
export function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {body && (
        <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
      )}
      {actionLabel && onAction && (
        <GradientButton
          label={actionLabel}
          onPress={onAction}
          style={{ marginTop: spacing.md, alignSelf: "center", minWidth: 160 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    padding: spacing.xxl,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: radius.lg,
  },
  icon: { fontSize: 36 },
  title: { ...type.subheading, textAlign: "center" },
  body: { ...type.body, textAlign: "center", lineHeight: 22 },
});
