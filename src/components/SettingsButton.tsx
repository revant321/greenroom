import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Icon } from "./Icon";
import { useTheme } from "@/theme/useTheme";

/**
 * Omnipresent settings gear — 42px frosted glass circle, top-right.
 * Rotates 60° (one cog-tooth realignment) while the Settings screen is
 * open; tapping it again closes Settings.
 */
export function SettingsButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, speed } = useTheme();
  const open = pathname === "/settings";
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withTiming(open ? 60 : 0, {
      duration: 500 * speed,
      easing: Easing.bezier(0.34, 1.4, 0.5, 1),
    });
  }, [open, speed, rot]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  function onPress() {
    if (open) router.back();
    else router.push("/settings");
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityLabel="Settings"
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <BlurView
        intensity={80}
        tint={colors.navBlurTint}
        style={[
          styles.circle,
          {
            backgroundColor: colors.navGlassTint,
            borderColor: colors.navGlassBorder,
          },
        ]}
      >
        <Animated.View style={iconStyle}>
          <Icon
            sf="gearshape.fill"
            ion="settings-sharp"
            size={20}
            color={open ? colors.text : colors.textMuted}
          />
        </Animated.View>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
