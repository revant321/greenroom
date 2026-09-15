import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { cardSurface, radius, spacing } from "@/theme/tokens";

export function Skeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.base, { backgroundColor: colors.border, opacity }, style]}
    />
  );
}

const LINE_WIDTHS = ["62%", "48%", "70%", "55%"] as const;

/**
 * Card-shaped placeholders for a list's first load. Uses the same card
 * surface, padding and gap as the real rows so nothing shifts when data
 * arrives. `badge` mirrors rows that lead with a 44pt tile; `twoLine`
 * mirrors rows with a caption under the title.
 */
export function ListSkeleton({
  rows = 4,
  badge = false,
  twoLine = false,
  style,
}: {
  rows?: number;
  badge?: boolean;
  twoLine?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.list, style]} accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[cardSurface(colors), styles.card]}>
          {badge && <Skeleton style={styles.badge} />}
          <View style={styles.lines}>
            <Skeleton style={{ width: LINE_WIDTHS[i % LINE_WIDTHS.length], height: 20 }} />
            {twoLine && <Skeleton style={styles.caption} />}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Placeholder for a detail screen: title, status line, a card, a section. */
export function DetailSkeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.detail, style]} accessibilityLabel="Loading">
      <Skeleton style={{ width: "70%", height: 32 }} />
      <Skeleton style={{ width: "18%", height: 12 }} />
      <View style={[cardSurface(colors), styles.card, { marginTop: spacing.md }]}>
        <Skeleton style={{ width: "40%", height: 20 }} />
      </View>
      <Skeleton style={{ width: "24%", height: 12, marginTop: spacing.xl }} />
      <Skeleton style={{ height: 120, borderRadius: radius.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.sm, height: 16 },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  badge: { width: 44, height: 44, borderRadius: radius.md },
  lines: { flex: 1, gap: spacing.sm },
  caption: { width: "36%", height: 12 },
  detail: { padding: spacing.lg, gap: spacing.sm },
});
