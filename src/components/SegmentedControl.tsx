import { useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import { fonts, fontScale, press, radius, spacing } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

/**
 * Segmented control with a sliding thumb (prototype's appearance /
 * animation-speed / Musical-vs-Play control). Thumb glides with a gentle
 * overshoot; labels cross-fade color.
 */
const EASE = Easing.bezier(0.34, 1.4, 0.5, 1);

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  /** Optional display labels; defaults to capitalized option values. */
  labels?: Partial<Record<T, string>>;
}) {
  const { colors, speed } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(options.indexOf(value), 0);
  const x = useSharedValue(0);

  const segW = width > 0 ? (width - spacing.xxs * 2) / options.length : 0;

  useEffect(() => {
    x.value = withTiming(index * segW, { duration: 320 * speed, easing: EASE });
  }, [index, segW, speed, x]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  return (
    <View
      onLayout={onLayout}
      style={[styles.track, { backgroundColor: colors.accentSoft }]}
    >
      {segW > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            { width: segW, backgroundColor: colors.card },
            thumbStyle,
          ]}
        />
      )}
      {options.map((opt) => {
        const active = opt === value;
        const label =
          labels?.[opt] ?? opt.charAt(0).toUpperCase() + opt.slice(1);
        return (
          <Pressable
            key={opt}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.seg, pressed && press.dim]}
            onPress={() => {
              if (!active) haptics.select();
              onChange(opt);
            }}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.text : colors.textMuted },
              ]}
              maxFontSizeMultiplier={fontScale.compact}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: spacing.xxs,
    position: "relative",
  },
  thumb: {
    position: "absolute",
    top: spacing.xxs,
    bottom: spacing.xxs,
    left: spacing.xxs,
    borderRadius: radius.md,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  seg: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    fontWeight: "600",
  },
});
