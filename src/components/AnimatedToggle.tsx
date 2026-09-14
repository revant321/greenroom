import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import { press } from "@/theme/tokens";

/**
 * Prototype toggle: 51×31 pill, knob glides with a gentle overshoot while
 * the track color cross-fades (no snap). Replaces RN's <Switch>.
 */
export const TOGGLE_WIDTH = 51;
export const TOGGLE_HEIGHT = 31;
const KNOB_TRAVEL = 20;
const EASE = Easing.bezier(0.34, 1.4, 0.5, 1);

export function AnimatedToggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors, speed } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: 280 * speed,
      easing: EASE,
    });
  }, [value, speed, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      Math.min(Math.max(progress.value, 0), 1),
      [0, 1],
      [colors.border, colors.success],
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * KNOB_TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => !disabled && onValueChange(!value)}
      hitSlop={8}
      style={({ pressed }) => [disabled ? styles.disabled : pressed && press.scale]}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  track: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: 16,
    justifyContent: "center",
  },
  knob: {
    position: "absolute",
    left: 2,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
