import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { useUpdateShow } from "@/services/showService";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, radius, spacing, type } from "@/theme/tokens";

export function ArchivedBanner({ showId }: { showId: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const update = useUpdateShow();

  function onRestore() {
    update.mutate({
      id: showId,
      patch: { is_completed: false, completed_at: null },
    });
  }

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Icon sf="trophy.fill" ion="trophy" size={18} color={colors.warn} />
        <Text style={styles.text}>Archived — read-only</Text>
      </View>
      <Pressable
        onPress={onRestore}
        style={styles.restore}
        disabled={update.isPending}
      >
        <Text style={styles.restoreText}>
          {update.isPending ? "Restoring…" : "Restore"}
        </Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: c.bgElevated,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      marginBottom: spacing.md,
    },
    left: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    text: { ...type.body, color: c.text },
    restore: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    restoreText: { color: "#fff", fontWeight: "600" },
  });
}
