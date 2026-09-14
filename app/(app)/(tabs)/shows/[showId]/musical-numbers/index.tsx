import {
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
import { DeleteButton } from "@/components/DeleteButton";
import { EmptyState } from "@/components/EmptyState";
import { RiseIn } from "@/components/RiseIn";
import { ListSkeleton } from "@/components/Skeleton";
import { GradientFab } from "@/components/GradientFab";
import {
  cardSurface,
  ColorTokens,
  contentInset,
  fonts,
  pressedCard,
  spacing,
} from "@/theme/tokens";

export default function MusicalNumbers() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data, isLoading, error, refetch, isRefetching } =
    useMusicalNumbers(showId);
  const { data: show } = useShow(showId);
  const readOnly = show?.is_completed === true;
  const del = useDeleteMusicalNumber();

  const loading = isLoading && !data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "" }} />
      <RiseIn index={0}>
        <Text style={styles.heading}>Musical Numbers</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {show?.name ?? " "}
        </Text>
      </RiseIn>
      {readOnly && (
        <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
          <ArchivedBanner showId={showId!} />
        </View>
      )}
      {loading ? (
        <ListSkeleton />
      ) : error && !data ? (
        <View style={styles.listPad}>
          <EmptyState
            icon="⚠️"
            title="Couldn't load musical numbers"
            body="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        </View>
      ) : (
      <FlatList
        data={data ?? []}
        keyExtractor={(m) => m.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: contentInset.fab,
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
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() =>
                router.push(`/shows/${showId}/musical-numbers/${item.id}`)
              }
              accessibilityRole="button"
            >
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {!readOnly && (
                <DeleteButton
                  title="Delete this number?"
                  message={`Removes “${item.name}” and every harmony, dance video, and PDF inside it.`}
                  onConfirm={() => del.mutate(item.id)}
                  label="Delete musical number"
                />
              )}
              <Icon sf="chevron.right" ion="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </RiseIn>
        )}
      />
      )}
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
    listPad: { padding: spacing.lg },
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
      marginTop: spacing.xxs,
    },
    card: {
      ...cardSurface(c),
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
    },
    cardPressed: pressedCard(c),
    name: {
      flex: 1,
      fontSize: 17,
      fontFamily: fonts.semibold,
      fontWeight: "600",
      color: c.text,
    },
  });
}
