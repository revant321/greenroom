import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SongFilter, useDeleteSong, useSongs } from "@/services/songService";
import { confirm } from "@/utils/confirm";
import { useFocusRefresh } from "@/hooks/useFocusRefresh";
import { useTheme } from "@/theme/useTheme";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/EmptyState";
import { RiseIn } from "@/components/RiseIn";
import { GradientFab } from "@/components/GradientFab";
import { Gradient, gradientShadow } from "@/components/Gradient";
import { ScreenTitle } from "@/components/ScreenTitle";
import { SettingsButton } from "@/components/SettingsButton";
import {
  ColorTokens,
  FAB_CLEARANCE,
  fonts,
  radius,
  spacing,
} from "@/theme/tokens";

/**
 * Songs home (prototype port):
 * - Search bar that finds SONGS (by title) and CATEGORIES (by name).
 *   Category results render as gradient folder rows — visually distinct
 *   from song rows — and tapping one applies it as the active filter.
 * - The active filter shows as a removable "Showing [X]" gradient chip.
 * - Cards re-play the staggered rise whenever the filter changes.
 */
const PRESETS: { label: string; filter: SongFilter }[] = [
  { label: "All", filter: {} },
  { label: "Audition", filter: { is_audition_song: true } },
  { label: "Vocal", filter: { category: "vocal" } },
  { label: "Guitar", filter: { category: "guitar" } },
  { label: "In progress", filter: { status: "in-progress" } },
  { label: "Completed", filter: { status: "completed" } },
];

export default function Songs() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const [preset, setPreset] = useState(0);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSongs(PRESETS[preset].filter);
  const { data: allSongs } = useSongs({});
  const del = useDeleteSong();
  const focusTick = useFocusRefresh();

  const q = search.trim().toLowerCase();
  const searching = q.length > 0;

  const catResults = useMemo(
    () =>
      searching
        ? PRESETS.filter(
            (p, i) => i > 0 && p.label.toLowerCase().includes(q),
          )
        : [],
    [q, searching],
  );
  const songResults = useMemo(
    () =>
      searching
        ? (allSongs ?? []).filter((s) => s.title.toLowerCase().includes(q))
        : [],
    [q, searching, allSongs],
  );

  const totalCount = allSongs?.length ?? 0;

  function applyCategory(label: string) {
    const i = PRESETS.findIndex((p) => p.label === label);
    if (i >= 0) {
      setPreset(i);
      setSearch("");
    }
  }

  const songCard = (item: NonNullable<typeof data>[number], index: number) => (
    <RiseIn
      index={index}
      refreshKey={`${focusTick}-${searching ? "search" : preset}`}
    >
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/songs/${item.id}`)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.tagRow}>
            {item.is_audition_song && <Tag label="Audition" colors={colors} />}
            {item.category && (
              <Tag
                label={item.category[0].toUpperCase() + item.category.slice(1)}
                colors={colors}
              />
            )}
            <StatusPill
              done={item.status === "completed"}
              colors={colors}
            />
          </View>
        </View>
        <Pressable
          onPress={() =>
            confirm(
              "Delete forever?",
              `Removes “${item.title}” and every part, track, and PDF inside it.`,
              () => del.mutate(item.id),
            )
          }
          hitSlop={8}
        >
          <Icon sf="trash" ion="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </Pressable>
    </RiseIn>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <RiseIn index={0} refreshKey={focusTick}>
        <ScreenTitle
          title="Songs"
          subtitle={`${totalCount} song${totalCount === 1 ? "" : "s"} in your library`}
          right={<SettingsButton />}
        />
        <View style={[styles.search, { backgroundColor: colors.accentSoft }]}>
          <Icon sf="magnifyingglass" ion="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search songs & categories"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
          />
          {searching && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Icon
                sf="xmark.circle.fill"
                ion="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </View>
      </RiseIn>

      {/* Active filter indicator (replaces the old chip row) */}
      {!searching && preset !== 0 && (
        <View style={styles.showingRow}>
          <Text style={[styles.showingLabel, { color: colors.textMuted }]}>
            Showing
          </Text>
          <Pressable
            onPress={() => setPreset(0)}
            style={[gradientShadow.glowSm]}
            accessibilityLabel={`Clear ${PRESETS[preset].label} filter`}
          >
            <Gradient style={styles.showingChip}>
              <Text style={styles.showingChipText}>{PRESETS[preset].label}</Text>
              <Icon sf="xmark" ion="close" size={11} color="#fff" />
            </Gradient>
          </Pressable>
        </View>
      )}

      {searching ? (
        <FlatList
          data={songResults}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listPad}
          ListHeaderComponent={
            <>
              {catResults.length > 0 && (
                <View style={{ marginBottom: spacing.lg }}>
                  <Text style={[styles.resultHead, { color: colors.textMuted }]}>
                    CATEGORIES
                  </Text>
                  <View style={{ gap: spacing.sm }}>
                    {catResults.map((p) => (
                      <Pressable
                        key={p.label}
                        style={[styles.catRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => applyCategory(p.label)}
                      >
                        <Gradient style={styles.catBadge}>
                          <Icon sf="folder.fill" ion="folder" size={18} color="#fff" />
                        </Gradient>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.catName, { color: colors.text }]}>
                            {p.label}
                          </Text>
                          <Text style={[styles.catSub, { color: colors.textMuted }]}>
                            Category
                          </Text>
                        </View>
                        <Icon
                          sf="chevron.right"
                          ion="chevron-forward"
                          size={14}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              {songResults.length > 0 && (
                <Text style={[styles.resultHead, { color: colors.textMuted }]}>
                  SONGS
                </Text>
              )}
              {catResults.length === 0 && songResults.length === 0 && (
                <EmptyState
                  title="No matches"
                  body={`No songs or categories match “${search.trim()}”.`}
                />
              )}
            </>
          }
          renderItem={({ item, index }) => songCard(item, index)}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      ) : isLoading && !data ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.text} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.listPad}
          ListEmptyComponent={
            preset === 0 ? (
              <EmptyState
                icon="🎵"
                title="No songs yet"
                body="Tap + to add your first song."
              />
            ) : (
              <EmptyState
                title="No matches"
                body="Nothing in this category yet."
              />
            )
          }
          renderItem={({ item, index }) => songCard(item, index)}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}
      <GradientFab
        onPress={() => router.push("/songs/new")}
        accessibilityLabel="Add song"
      />
    </View>
  );
}

function Tag({ label, colors }: { label: string; colors: ColorTokens }) {
  return (
    <View style={[tagStyles.tag, { backgroundColor: colors.accentSoft }]}>
      <Text style={[tagStyles.tagText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function StatusPill({ done, colors }: { done: boolean; colors: ColorTokens }) {
  return (
    <View
      style={[
        tagStyles.tag,
        { backgroundColor: done ? colors.accentSoft : "transparent" },
      ]}
    >
      <Text
        style={[
          tagStyles.tagText,
          { color: done ? colors.accent : colors.textMuted },
        ]}
      >
        {done ? "Completed" : "In progress"}
      </Text>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagText: { fontSize: 12, fontFamily: fonts.medium, fontWeight: "500" },
});

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginHorizontal: spacing.lg,
      marginTop: 14,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: fonts.regular,
      padding: 0,
    },
    showingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: 14,
    },
    showingLabel: { fontSize: 13, fontFamily: fonts.regular },
    showingChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    showingChipText: {
      color: "#fff",
      fontSize: 13,
      fontFamily: fonts.bold,
      fontWeight: "700",
    },
    listPad: {
      padding: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: FAB_CLEARANCE + spacing.lg,
    },
    resultHead: {
      fontSize: 12,
      fontFamily: fonts.bold,
      fontWeight: "700",
      letterSpacing: 0.9,
      marginBottom: 9,
      paddingHorizontal: 2,
    },
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
    title: {
      fontSize: 17,
      fontFamily: fonts.semibold,
      fontWeight: "600",
      letterSpacing: -0.2,
      color: c.text,
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
    },
    catRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      padding: 11,
      paddingHorizontal: 14,
      borderRadius: radius.lg,
      borderWidth: 1,
    },
    catBadge: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    catName: {
      fontSize: 16,
      fontFamily: fonts.bold,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    catSub: { fontSize: 13, fontFamily: fonts.regular, marginTop: 1 },
  });
}
