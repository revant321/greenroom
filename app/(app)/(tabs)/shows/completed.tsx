import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useDeleteShow, useShows, useUpdateShow } from "@/services/showService";
import { useTheme } from "@/theme/useTheme";
import { DeleteButton } from "@/components/DeleteButton";
import { IconButton } from "@/components/IconButton";
import { EmptyState } from "@/components/EmptyState";
import {
  cardSurface,
  ColorTokens,
  FAB_CLEARANCE,
  pressedCard,
  spacing,
  type,
} from "@/theme/tokens";

export default function Completed() {
  const router = useRouter();
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
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push(`/shows/${item.id}`)}
          accessibilityRole="button"
        >
          <View style={styles.nameLink}>
            <Text style={styles.name}>{item.name}</Text>
          </View>
          <View style={styles.actions}>
            <IconButton
              sf="arrow.uturn.backward.circle"
              ion="arrow-undo-circle-outline"
              size={24}
              color={colors.accent}
              label="Restore show"
              onPress={() =>
                update.mutate({
                  id: item.id,
                  patch: { is_completed: false, completed_at: null },
                })
              }
            />
            <DeleteButton
              title="Delete permanently?"
              message={`Removes “${item.name}” and every harmony, scene recording, dance video, and PDF associated with it. This can't be undone.`}
              confirmLabel="Delete forever"
              onConfirm={() => del.mutate(item.id)}
              label="Delete show forever"
              size={22}
            />
          </View>
        </Pressable>
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
      ...cardSurface(c),
      padding: spacing.lg,
    },
    cardPressed: pressedCard(c),
    nameLink: { flex: 1 },
    name: { ...type.bodyStrong, color: c.text },
    actions: { flexDirection: "row", gap: spacing.lg, alignItems: "center" },
  });
}
