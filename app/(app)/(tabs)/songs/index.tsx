import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { SongFilter, useDeleteSong, useSongs } from "@/services/songService";
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
  const styles = makeStyles(colors);
  const [preset, setPreset] = useState(0);
  const { data, isLoading } = useSongs(PRESETS[preset].filter);
  const del = useDeleteSong();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.filters}>
        {PRESETS.map((p, i) => (
          <Pressable
            key={p.label}
            onPress={() => setPreset(i)}
            style={[styles.chip, i === preset && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, i === preset && styles.chipTextActive]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {isLoading && !data ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.text} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.md,
            paddingBottom: FAB_CLEARANCE + spacing.lg,
          }}
          ListEmptyComponent={
            preset === 0 ? (
              <EmptyState
                icon="🎵"
                title="No songs yet"
                body="Tap + to add your first song."
                actionLabel="Add song"
                onAction={() => router.push("/songs/new")}
              />
            ) : (
              <EmptyState
                title="No matches"
                body="Try a different filter chip."
              />
            )
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Link href={`/songs/${item.id}`} style={{ flex: 1 }}>
                <View>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {[
                      item.category,
                      item.status,
                      item.is_audition_song ? "audition" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              </Link>
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
      )}
      <Pressable style={styles.fab} onPress={() => router.push("/songs/new")}>
        <Icon sf="plus" ion="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    filters: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      padding: spacing.md,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { color: c.text, fontSize: 14 },
    chipTextActive: { color: "#fff", fontWeight: "600" },
    card: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.lg,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    title: { ...type.bodyStrong, color: c.text },
    meta: { ...type.caption, color: c.textMuted, marginTop: 2 },
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
