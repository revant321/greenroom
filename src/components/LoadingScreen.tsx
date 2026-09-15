import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

/**
 * Full-screen spinner for the auth gate, before any screen chrome exists.
 * Painted with the theme background so dark mode never flashes white.
 */
export function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
