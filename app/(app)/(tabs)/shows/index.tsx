import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDeleteShow, useShows } from "@/services/showService";
import { Show } from "@/lib/types";
import { confirm } from "@/utils/confirm";
import { useTheme } from "@/theme/useTheme";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/EmptyState";
import { RiseIn } from "@/components/RiseIn";
import { GradientFab } from "@/components/GradientFab";
import { ScreenTitle } from "@/components/ScreenTitle";
import { SettingsButton } from "@/components/SettingsButton";
import {
  ColorTokens,
  FAB_CLEARANCE,
  fonts,
  radius,
  spacing,
} from "@/theme/tokens";

export default function ShowsList() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const { data, isLoading, error, refetch, isRefetching } = useShows({
    completed: false,
  });
  const { data: completedShows } = useShows({ completed: true });
  const trophyCount = completedShows?.length ?? 0;
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

  const count = data?.length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <RiseIn index={0}>
        <ScreenTitle
          title="Shows"
          subtitle={`${count} production${count === 1 ? "" : "s"} in progress`}
          right={<SettingsButton />}
        />
      </RiseIn>
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
              icon="🎭"
              title="No shows yet"
              body="Shows hold your songs and scenes. Tap + to add one."
            />
          </RiseIn>
        }
        ListFooterComponent={
          trophyCount > 0 ? (
            <RiseIn index={Math.min(count, 8) + 1}>
              <Link href="/shows/completed" asChild>
                <Pressable
                  style={styles.trophyCard}
                  accessibilityLabel="Open Trophy Case"
                >
                  <View style={styles.trophyLeft}>
                    <View style={styles.trophyBadge}>
                      <Icon sf="trophy.fill" ion="trophy" size={20} color={colors.warn} />
                    </View>
                    <View>
                      <Text style={styles.trophyText}>Trophy Case</Text>
                      <Text style={styles.trophySub}>
                        {trophyCount} completed show{trophyCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>
                  <Icon
                    sf="chevron.right"
                    ion="chevron-forward"
                    size={16}
                    color={colors.textMuted}
                  />
                </Pressable>
              </Link>
            </RiseIn>
          ) : null
        }
        renderItem={({ item, index }: { item: Show; index: number }) => (
          <RiseIn index={index + 1}>
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/shows/${item.id}`)}
            >
              <View style={styles.initials}>
                <Text style={styles.initialsText}>
                  {item.name
                    .split(/\s+/)
                    .map((w) => w[0] ?? "")
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.nameWrap}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/shows/complete",
                      params: { showId: item.id },
                    })
                  }
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
                  <Icon sf="trash" ion="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              </View>
            </Pressable>
          </RiseIn>
        )}
      />
      <GradientFab
        onPress={() => router.push("/shows/new")}
        accessibilityLabel="Add show"
      />
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg - 2,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
    initials: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    initialsText: {
      fontSize: 16,
      fontFamily: fonts.bold,
      fontWeight: "700",
      color: c.accent,
    },
    nameWrap: { flex: 1 },
    name: {
      fontSize: 17,
      fontFamily: fonts.semibold,
      fontWeight: "600",
      letterSpacing: -0.2,
      color: c.text,
    },
    actions: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
    trophyCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.lg - 2,
      marginTop: spacing.xl,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: "rgba(255,176,58,0.28)",
    },
    trophyLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    trophyBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: "rgba(255,176,58,0.10)",
      alignItems: "center",
      justifyContent: "center",
    },
    trophyText: {
      fontSize: 16,
      fontFamily: fonts.semibold,
      fontWeight: "600",
      color: c.warn,
    },
    trophySub: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: c.textMuted,
      marginTop: 1,
    },
  });
}
