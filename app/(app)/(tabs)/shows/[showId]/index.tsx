import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useShow } from "@/services/showService";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import { RiseIn } from "@/components/RiseIn";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton, Skeleton } from "@/components/Skeleton";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/theme/useTheme";
import {
  cardSurface,
  ColorTokens,
  FAB_CLEARANCE,
  fonts,
  pressedCard,
  radius,
  spacing,
} from "@/theme/tokens";

export default function ShowHub() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const { data: show, isLoading } = useShow(showId);
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  if (isLoading && !show) {
    return (
      <View style={styles.container}>
        <Skeleton style={styles.titleGhost} />
        <ListSkeleton rows={2} badge twoLine style={styles.tilesGhost} />
      </View>
    );
  }
  if (!show) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="🎭"
          title="Show not found"
          body="It may have been deleted on another device."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "" }} />
      {show.is_completed && <ArchivedBanner showId={show.id} />}
      <RiseIn index={0}>
        <Text style={styles.title}>{show.name}</Text>
      </RiseIn>

      <RiseIn index={1}>
        <Pressable
          style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
          onPress={() => router.push(`/shows/${show.id}/musical-numbers`)}
          accessibilityRole="button"
        >
          <View style={[styles.tileBadge, { backgroundColor: colors.accentSoft }]}>
            <Icon sf="music.note.list" ion="musical-notes" size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tileText}>Musical Numbers</Text>
            <Text style={styles.tileSub}>Harmonies, dance videos, sheet music</Text>
          </View>
          <Icon sf="chevron.right" ion="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </RiseIn>

      <RiseIn index={2}>
        <Pressable
          style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
          onPress={() => router.push(`/shows/${show.id}/scenes`)}
          accessibilityRole="button"
        >
          <View style={[styles.tileBadge, { backgroundColor: "rgba(192,107,255,0.14)" }]}>
            <Icon sf="list.clipboard" ion="clipboard-outline" size={23} color="#C06BFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tileText}>Scenes</Text>
            <Text style={styles.tileSub}>Blocking notes and recordings</Text>
          </View>
          <Icon sf="chevron.right" ion="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </RiseIn>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: c.bg,
      paddingBottom: FAB_CLEARANCE + spacing.lg,
    },
    titleGhost: { width: "60%", height: 36, marginBottom: spacing.sm },
    tilesGhost: { padding: 0 },
    title: {
      fontSize: 30,
      fontFamily: fonts.extrabold,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: c.text,
      marginBottom: spacing.sm,
    },
    tile: {
      flexDirection: "row",
      alignItems: "center",
      ...cardSurface(c),
      gap: spacing.md,
      padding: spacing.lg,
    },
    tilePressed: pressedCard(c),
    tileBadge: {
      width: 50,
      height: 50,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    tileText: {
      fontSize: 19,
      fontFamily: fonts.bold,
      fontWeight: "700",
      letterSpacing: -0.3,
      color: c.text,
    },
    tileSub: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: c.textMuted,
      marginTop: spacing.xxs,
    },
  });
}
