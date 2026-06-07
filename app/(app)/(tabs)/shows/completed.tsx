import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { useDeleteShow, useShows, useUpdateShow } from "@/services/showService";
import { confirm } from "@/utils/confirm";
import { useTheme } from "@/theme/useTheme";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/EmptyState";
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
        flexGrow: 1,
      }}
      ListEmptyComponent={
        <EmptyState
          icon="🏆"
          title="No trophies yet"
          body="Shows you complete will be archived here. Tap the checkmark on an active show to add it."
        />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Link href={`/shows/${item.id}`} style={styles.nameLink}>
            <Text style={styles.name}>{item.name}</Text>
          </Link>
          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                update.mutate({
                  id: item.id,
                  patch: { is_completed: false, completed_at: null },
                })
              }
              accessibilityLabel="Restore show"
              hitSlop={8}
            >
              <Icon
                sf="arrow.uturn.backward.circle"
                ion="arrow-undo-circle-outline"
                size={24}
                color={colors.accent}
              />
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
              accessibilityLabel="Delete forever"
              hitSlop={8}
            >
              <Icon
                sf="trash"
                ion="trash-outline"
                size={22}
                color={colors.danger}
              />
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
    nameLink: { flex: 1 },
    name: { ...type.bodyStrong, color: c.text },
    actions: { flexDirection: "row", gap: spacing.lg, alignItems: "center" },
  });
}
