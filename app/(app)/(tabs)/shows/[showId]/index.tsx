import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useShow } from "@/services/showService";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import { RiseIn } from "@/components/RiseIn";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, FAB_CLEARANCE, fonts, radius, spacing } from "@/theme/tokens";

export default function ShowHub() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const { data: show, isLoading } = useShow(showId);
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  if (isLoading && !show) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }
  if (!show) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text }}>Show not found.</Text>
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
          style={styles.tile}
          onPress={() => router.push(`/shows/${show.id}/musical-numbers`)}
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
          style={styles.tile}
          onPress={() => router.push(`/shows/${show.id}/scenes`)}
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
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
      gap: 14,
      padding: spacing.lg + 2,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
    tileBadge: {
      width: 50,
      height: 50,
      borderRadius: 13,
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
      marginTop: 2,
    },
  });
}
