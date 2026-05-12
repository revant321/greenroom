import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDeleteShow, useShows, useUpdateShow } from "@/services/showService";
import { confirm } from "@/utils/confirm";
import { useTheme } from "@/theme/useTheme";
import {
  ColorTokens,
  FAB_CLEARANCE,
  radius,
  spacing,
  type,
} from "@/theme/tokens";

export default function Completed() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data, isLoading } = useShows({ completed: true });
  const update = useUpdateShow();
  const del = useDeleteShow();

  if (isLoading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={data ?? []}
      keyExtractor={(s) => s.id}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.md,
        paddingBottom: FAB_CLEARANCE + spacing.lg,
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={{ color: colors.textMuted }}>No completed shows.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                update.mutate({
                  id: item.id,
                  patch: { is_completed: false, completed_at: null },
                })
              }
            >
              <Text style={styles.restore}>Restore</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                confirm(
                  "Delete permanently?",
                  `Removes “${item.name}” and every harmony, scene recording, dance video, and PDF associated with it. This can't be undone.`,
                  () => del.mutate(item.id),
                  "Delete forever",
                )
              }
            >
              <Text style={styles.deleteForever}>Delete forever</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { padding: spacing.xxl, alignItems: "center" },
    card: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.lg,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    name: { ...type.bodyStrong, color: c.text, flex: 1 },
    actions: { flexDirection: "row", gap: spacing.lg },
    restore: { color: c.accent, fontWeight: "500" },
    deleteForever: { color: c.danger, fontWeight: "500" },
  });
}
