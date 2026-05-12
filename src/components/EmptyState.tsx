import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, type } from "@/theme/tokens";

type Props = {
  icon?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {body && (
        <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={[styles.action, { backgroundColor: colors.accent }]}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", padding: spacing.xxl, gap: spacing.sm },
  icon: { fontSize: 40 },
  title: { ...type.heading },
  body: { ...type.body, textAlign: "center" },
  action: {
    marginTop: spacing.md,
    padding: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
});
