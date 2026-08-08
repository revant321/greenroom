import { ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme/useTheme";
import { gradientVector } from "@/theme/tokens";

/**
 * Signature gradient surface (warm → pink → violet, 135°).
 * Used for: active chips, primary buttons, the FAB, active play buttons,
 * toggle "pop" states — anywhere the prototype uses the gradient.
 */
export function Gradient({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={[...colors.gradientColors]}
      start={gradientVector.start}
      end={gradientVector.end}
      locations={[...gradientVector.locations]}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

/** Elevation presets that match the prototype's pink glow. */
export const gradientShadow = StyleSheet.create({
  glow: {
    shadowColor: "#F0447D",
    shadowOpacity: 0.45,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  glowSm: {
    shadowColor: "#F0447D",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
