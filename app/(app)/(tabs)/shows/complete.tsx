import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  useArchiveShowWithSelection,
  useShow,
  useShowMediaCounts,
} from "@/services/showService";
import { MediaKind } from "@/services/cascadeDelete";
import { Skeleton } from "@/components/Skeleton";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, radius, spacing, type } from "@/theme/tokens";

const KIND_LABELS: Record<MediaKind, string> = {
  audio: "Audio recordings",
  video: "Videos",
  pdf: "PDFs / sheet music",
  links: "External links",
};

const KIND_ORDER: MediaKind[] = ["audio", "video", "pdf", "links"];

export default function CompleteShow() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const { data: show } = useShow(showId);
  const { data: counts, isLoading } = useShowMediaCounts(showId);
  const archive = useArchiveShowWithSelection();

  const [keep, setKeep] = useState<Record<MediaKind, boolean>>({
    audio: true,
    video: true,
    pdf: true,
    links: true,
  });

  async function onConfirm() {
    if (!showId) return;
    try {
      await archive.mutateAsync({ id: showId, keep });
      router.back();
      router.replace("/shows/completed");
    } catch (e: any) {
      Alert.alert("Couldn't archive", e?.message ?? String(e));
    }
  }

  const visibleKinds = counts
    ? KIND_ORDER.filter((k) => (counts[k] ?? 0) > 0)
    : [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: show ? `Complete "${show.name}"` : "Complete show" }}
      />
      <Text style={styles.subhead}>Keep these in your Trophy Case:</Text>

      {isLoading ? (
        <View style={{ gap: spacing.sm }}>
          <Skeleton style={{ height: 40 }} />
          <Skeleton style={{ height: 40 }} />
          <Skeleton style={{ height: 40 }} />
        </View>
      ) : visibleKinds.length === 0 ? (
        <Text style={styles.emptyNote}>
          This show has no media — nothing to choose.
        </Text>
      ) : (
        <View style={styles.list}>
          {visibleKinds.map((kind) => (
            <View key={kind} style={styles.row}>
              <Text style={styles.rowLabel}>
                {KIND_LABELS[kind]}{" "}
                <Text style={styles.rowCount}>({counts?.[kind] ?? 0})</Text>
              </Text>
              <Switch
                value={keep[kind]}
                onValueChange={(v) =>
                  setKeep((prev) => ({ ...prev, [kind]: v }))
                }
              />
            </View>
          ))}
          <Text style={styles.footnote}>
            Anything turned off will be permanently removed from storage.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.back()}
          style={styles.cancel}
          disabled={archive.isPending}
        >
          <Text style={{ color: colors.text }}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          style={styles.confirm}
          disabled={archive.isPending || isLoading}
        >
          {archive.isPending ? (
            <View style={styles.confirmInner}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.confirmText}>Archiving…</Text>
            </View>
          ) : (
            <Text style={styles.confirmText}>Complete & Archive</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.xl,
      gap: spacing.lg,
      backgroundColor: c.bg,
    },
    subhead: { ...type.body, color: c.textMuted },
    list: { gap: spacing.sm },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.lg,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    rowLabel: { ...type.body, color: c.text },
    rowCount: { color: c.textMuted },
    footnote: { ...type.caption, color: c.textMuted, marginTop: spacing.sm },
    emptyNote: { ...type.body, color: c.textMuted },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.md,
      marginTop: "auto",
    },
    cancel: { padding: spacing.md },
    confirm: {
      padding: spacing.md,
      paddingHorizontal: spacing.xl,
      backgroundColor: c.accent,
      borderRadius: radius.md,
    },
    confirmInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    confirmText: { color: "#fff", fontWeight: "600" },
  });
}
