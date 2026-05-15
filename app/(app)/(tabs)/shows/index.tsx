import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import {
  useCompleteShow,
  useDeleteShow,
  useShows,
} from "@/services/showService";
import { Show } from "@/lib/types";
import { confirm } from "@/utils/confirm";
import { useTheme } from "@/theme/useTheme";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/EmptyState";
import { ColorTokens, FAB_CLEARANCE, radius, spacing, type } from "@/theme/tokens";

export default function ShowsList() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data, isLoading, error, refetch, isRefetching } = useShows({
    completed: false,
  });
  const complete = useCompleteShow();
  const del = useDeleteShow();

  if (isLoading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text }}>Couldn't load shows.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: FAB_CLEARANCE + spacing.lg,
        }}
        ListEmptyComponent={
          <EmptyState
            icon="🎭"
            title="No shows yet"
            body="Tap + to add your first show."
            actionLabel="Add show"
            onAction={() => router.push("/shows/new")}
          />
        }
        renderItem={({ item }: { item: Show }) => (
          <View style={styles.card}>
            <Link href={`/shows/${item.id}`} style={styles.nameLink}>
              <Text style={styles.name}>{item.name}</Text>
            </Link>
            <View style={styles.actions}>
              <Pressable
                onPress={() => complete.mutate(item.id)}
                accessibilityLabel="Mark complete"
                hitSlop={8}
              >
                <Icon
                  sf="checkmark.circle"
                  ion="checkmark-circle-outline"
                  size={24}
                  color={colors.success}
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  confirm(
                    "Delete forever?",
                    `Removes “${item.name}” and every harmony, scene recording, dance video, and PDF inside it.`,
                    () => del.mutate(item.id),
                  )
                }
                accessibilityLabel="Delete show"
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
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/shows/new")}
        accessibilityLabel="Add show"
      >
        <Icon sf="plus" ion="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { padding: spacing.xxl, alignItems: "center" },
    emptyTitle: { ...type.bodyStrong, color: c.text, marginBottom: spacing.xs },
    emptyBody: { color: c.textMuted },
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
    actions: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
    fab: {
      position: "absolute",
      right: spacing.xl,
      bottom: FAB_CLEARANCE,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  });
}
