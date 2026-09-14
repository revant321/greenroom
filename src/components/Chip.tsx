import { Pressable, StyleSheet, Text } from "react-native";
import { Gradient, gradientShadow } from "./Gradient";
import { useTheme } from "@/theme/useTheme";
import { fonts, press, radius, spacing } from "@/theme/tokens";

/**
 * Filter / category chip. Active = signature gradient with a slight lift
 * and pink glow (prototype "3d pop"); inactive = card surface.
 */
export function Chip({
  label,
  active,
  onPress,
  small = false,
}: {
  label: string;
  active: boolean;
  onPress?: () => void;
  small?: boolean;
}) {
  const { colors } = useTheme();

  if (active) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        style={({ pressed }) => [
          gradientShadow.glowSm,
          { transform: [{ translateY: -1 }] },
          pressed && press.scale,
        ]}
      >
        <Gradient style={[styles.chip, small && styles.small]}>
          <Text style={[styles.label, small && styles.labelSmall, { color: "#fff" }]}>
            {label}
          </Text>
        </Gradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: false }}
      style={({ pressed }) => [
        styles.chip,
        small && styles.small,
        {
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        pressed && press.scale,
      ]}
    >
      <Text
        style={[styles.label, small && styles.labelSmall, { color: colors.textMuted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  small: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  label: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    fontWeight: "600",
  },
  labelSmall: { fontSize: 12 },
});
