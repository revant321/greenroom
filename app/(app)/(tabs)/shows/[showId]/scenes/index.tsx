import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useDeleteScene, useScenes } from "@/services/sceneService";
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
  FAB_CLEARANCE,
  fonts,
  pressedCard,
  spacing,
} from "@/theme/tokens";

export default function Scenes() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data, isLoading, error, refetch, isRefetching } = useScenes(showId);
  const { data: show } = useShow(showId);
  const readOnly = show?.is_completed === true;
  const del = useDeleteScene();

  const loading = isLoading && !data;
  const inCount = (data ?? []).filter((s) => s.is_user_in_scene).length;
  const sub = loading
    ? "Loading…"
    : `${show?.name ? `${show.name} · ` : ""}You're in ${inCount} of ${(data ?? []).length} scenes`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "" }} />
      <RiseIn index={0}>
        <Text style={styles.heading}>Scenes</Text>
        <Text style={styles.sub}>{sub}</Text>
      </RiseIn>
      {readOnly && (
        <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
          <ArchivedBanner showId={showId!} />
        </View>
      )}
      {loading ? (
        <ListSkeleton twoLine />
      ) : error && !data ? (
        <View style={styles.listPad}>
          <EmptyState
            icon="⚠️"
            title="Couldn't load scenes"
            body="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        </View>
      ) : (
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
          <RiseIn index={1}>
            <EmptyState
              icon="🎬"
              title="No scenes yet"
              body="Tap + to add a scene to this show."
            />
          </RiseIn>
        }
        renderItem={({ item, index }) => {
          const grayed = !item.is_user_in_scene;
          return (
            <RiseIn index={index + 1}>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  grayed && styles.cardGrayed,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => router.push(`/shows/${showId}/scenes/${item.id}`)}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.caption}>
                    {grayed ? "Not in this scene" : "You're in this scene"}
                  </Text>
                </View>
                {!readOnly && (
                  <DeleteButton
                    title="Delete this scene?"
                    message={`Removes “${item.name}” and every recording inside it.`}
                    onConfirm={() => del.mutate(item.id)}
                    label="Delete scene"
                  />
                )}
                <Icon sf="chevron.right" ion="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            </RiseIn>
          );
        }}
      />
      )}
      {!readOnly && (
        <GradientFab
          onPress={() => router.push(`/shows/${showId}/scenes/new`)}
          accessibilityLabel="Add scene"
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
    cardGrayed: { opacity: 0.45 },
    name: {
      fontSize: 17,
      fontFamily: fonts.semibold,
      fontWeight: "600",
      color: c.text,
    },
    caption: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: c.textMuted,
      marginTop: spacing.xxs,
    },
  });
}
