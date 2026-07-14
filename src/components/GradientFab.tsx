import { Pressable, StyleSheet } from "react-native";
import { Gradient, gradientShadow } from "./Gradient";
import { Icon } from "./Icon";
import { FAB_CLEARANCE, spacing } from "@/theme/tokens";

/**
 * Floating action button — 54px gradient circle with the prototype's pink
 * glow. Springs down slightly while pressed.
 */
export function GradientFab({
  onPress,
  accessibilityLabel,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.wrap,
        gradientShadow.glow,
        pressed && { transform: [{ scale: 0.9 }] },
      ]}
    >
      <Gradient style={styles.circle}>
        <Icon sf="plus" ion="add" size={26} color="#fff" />
      </Gradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: spacing.lg + 2,
    bottom: FAB_CLEARANCE,
  },
  circle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
});
