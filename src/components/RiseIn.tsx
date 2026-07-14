import { ReactNode, useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";

/**
 * Staggered entrance from the prototype: elements fade in while rising
 * 22px from below. Wrap each list card / screen block in <RiseIn index={i}>.
 *
 * Pass `refreshKey` (e.g. the active filter) to re-play the entrance when
 * the list content changes — matches the prototype's category-switch replay.
 */
const EASE = Easing.bezier(0.22, 0.9, 0.32, 1);

export function RiseIn({
  index = 0,
  refreshKey = "",
  style,
  children,
}: {
  index?: number;
  refreshKey?: string | number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { speed } = useTheme();
  const opacity = useSharedValue(0);
  const ty = useSharedValue(22);

  useEffect(() => {
    opacity.value = 0;
    ty.value = 22;
    const delay = (20 + Math.min(index, 8) * 60) * speed;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 580 * speed, easing: EASE }),
    );
    ty.value = withDelay(
      delay,
      withTiming(0, { duration: 580 * speed, easing: EASE }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
