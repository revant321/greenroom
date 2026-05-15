import { Link, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useShow } from "@/services/showService";
import { useTheme } from "@/theme/useTheme";
import {
  ColorTokens,
  FAB_CLEARANCE,
  radius,
  spacing,
  type,
} from "@/theme/tokens";

export default function ShowHub() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const { data: show, isLoading } = useShow(showId);
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
      <Stack.Screen options={{ title: show.name }} />
      <Text style={styles.title}>{show.name}</Text>

      <Link href={`/shows/${show.id}/musical-numbers`} style={styles.tile}>
        <Text style={styles.tileText}>Musical Numbers</Text>
      </Link>

      <Link href={`/shows/${show.id}/scenes`} style={styles.tile}>
        <Text style={styles.tileText}>Scenes</Text>
      </Link>
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
      paddingBottom: FAB_CLEARANCE + spacing.lg,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    title: {
      ...type.title,
      color: c.text,
      marginBottom: spacing.lg,
    },
    tile: {
      padding: spacing.xl - 4,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    tileText: { ...type.bodyStrong, color: c.text },
  });
}
