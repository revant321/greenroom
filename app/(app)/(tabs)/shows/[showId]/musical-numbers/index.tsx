import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import {
  useDeleteMusicalNumber,
  useMusicalNumbers,
} from "@/services/musicalNumberService";
import { useTheme } from "@/theme/useTheme";
import { Icon } from "@/components/Icon";
import {
  ColorTokens,
  FAB_CLEARANCE,
  radius,
  spacing,
  type,
} from "@/theme/tokens";

export default function MusicalNumbers() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data, isLoading, refetch, isRefetching } = useMusicalNumbers(showId);
  const del = useDeleteMusicalNumber();

  if (isLoading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(m) => m.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: FAB_CLEARANCE + spacing.lg,
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.textMuted }}>No musical numbers yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Link
              href={`/shows/${showId}/musical-numbers/${item.id}`}
              style={styles.nameLink}
            >
              <Text style={styles.name}>{item.name}</Text>
            </Link>
            <Pressable
              onPress={() => del.mutate(item.id)}
              accessibilityLabel="Delete"
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
        )}
      />
      <Pressable
        style={styles.fab}
        onPress={() => router.push(`/shows/${showId}/musical-numbers/new`)}
        accessibilityLabel="Add musical number"
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
    card: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.lg,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    nameLink: { flex: 1 },
    name: { ...type.bodyStrong, color: c.text },
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
