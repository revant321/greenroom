import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  useDeleteMusicalNumber,
  useMusicalNumbers,
} from "@/services/musicalNumberService";
import { useShow } from "@/services/showService";
import { useTheme } from "@/theme/useTheme";
import { Icon } from "@/components/Icon";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import { EmptyState } from "@/components/EmptyState";
import { RiseIn } from "@/components/RiseIn";
import { GradientFab } from "@/components/GradientFab";
import { ColorTokens, FAB_CLEARANCE, fonts, radius, spacing } from "@/theme/tokens";

export default function MusicalNumbers() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data, isLoading, refetch, isRefetching } = useMusicalNumbers(showId);
  const { data: show } = useShow(showId);
  const readOnly = show?.is_completed === true;
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
      <Stack.Screen options={{ title: "" }} />
      <RiseIn index={0}>
        <Text style={styles.heading}>Musical Numbers</Text>
        {show?.name ? <Text style={styles.sub}>{show.name}</Text> : null}
      </RiseIn>
      {readOnly && (
        <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
          <ArchivedBanner showId={showId!} />
        </View>
      )}
      <FlatList
        data={data ?? []}
        keyExtractor={(m) => m.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.sm + 2,
          paddingBottom: FAB_CLEARANCE + spacing.lg,
        }}
        ListEmptyComponent={
          <RiseIn index={1}>
            <EmptyState
              icon="🎵"
              title="No numbers yet"
              body="Tap + to add a musical number to this show."
            />
          </RiseIn>
        }
        renderItem={({ item, index }) => (
          <RiseIn index={index + 1}>
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push(`/shows/${showId}/musical-numbers/${item.id}`)
              }
            >
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {!readOnly && (
                <Pressable
                  onPress={() => del.mutate(item.id)}
                  accessibilityLabel="Delete"
                  hitSlop={8}
                >
                  <Icon sf="trash" ion="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              )}
              <Icon sf="chevron.right" ion="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </RiseIn>
        )}
      />
      {!readOnly && (
        <GradientFab
          onPress={() => router.push(`/shows/${showId}/musical-numbers/new`)}
          accessibilityLabel="Add musical number"
        />
      )}
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    heading: {
      fontSize: 28,
      fontFamily: fonts.extrabold,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: c.text,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    sub: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: c.textMuted,
      paddingHorizontal: spacing.lg,
      marginTop: 3,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg - 2,
      backgroundColor: c.card,
      borderRadius: radius.lg,
    },
    name: {
      flex: 1,
      fontSize: 17,
      fontFamily: fonts.semibold,
      fontWeight: "600",
      color: c.text,
    },
  });
}
