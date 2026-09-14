import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  useArchiveShowWithSelection,
  useShow,
  useShowMediaCounts,
} from "@/services/showService";
import { MediaKind } from "@/services/cascadeDelete";
import { Skeleton } from "@/components/Skeleton";
import {
  AnimatedToggle,
  TOGGLE_HEIGHT,
  TOGGLE_WIDTH,
} from "@/components/AnimatedToggle";
import { GradientButton } from "@/components/GradientButton";
import { haptics } from "@/utils/haptics";
import { useTheme } from "@/theme/useTheme";
import { cardSurface, ColorTokens, radius, spacing, type } from "@/theme/tokens";

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
      haptics.success();
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
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.row}>
              <Skeleton style={{ width: "50%", height: 20 }} />
              <Skeleton style={styles.toggleGhost} />
            </View>
          ))}
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
              <AnimatedToggle
                value={keep[kind]}
                onValueChange={(v) =>
                  setKeep((prev) => ({ ...prev, [kind]: v }))
                }
                accessibilityLabel={`Keep ${KIND_LABELS[kind].toLowerCase()}`}
              />
            </View>
          ))}
          <Text style={styles.footnote}>
            Anything turned off will be permanently removed from storage.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <GradientButton
          label="Cancel"
          variant="quiet"
          onPress={() => router.back()}
          disabled={archive.isPending}
          style={{ flex: 1 }}
        />
        <GradientButton
          label="Complete & Archive"
          onPress={onConfirm}
          loading={archive.isPending}
          disabled={isLoading}
          style={{ flex: 1.4 }}
        />
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
      ...cardSurface(c),
      padding: spacing.lg,
    },
    toggleGhost: {
      width: TOGGLE_WIDTH,
      height: TOGGLE_HEIGHT,
      borderRadius: radius.pill,
    },
    rowLabel: { ...type.body, color: c.text },
    rowCount: { color: c.textMuted },
    footnote: { ...type.caption, color: c.textMuted, marginTop: spacing.sm },
    emptyNote: { ...type.body, color: c.textMuted },
    actions: {
      flexDirection: "row",
      gap: spacing.md,
      marginTop: "auto",
    },
  });
}
