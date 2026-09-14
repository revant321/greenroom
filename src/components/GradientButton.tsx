import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import { gradientShadow } from "./Gradient";
import { LiquidGradient } from "./LiquidGradient";
import { useTheme } from "@/theme/useTheme";
import { fonts, fontScale, press, radius, spacing, type } from "@/theme/tokens";

/**
 * Primary action button — gradient fill, white 700 text, presses with a
 * small scale. `variant="quiet"` renders the neutral fill (Cancel).
 */
export function GradientButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "quiet";
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  if (variant === "quiet") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        style={({ pressed }) => [
          styles.base,
          { backgroundColor: colors.accentSoft },
          pressed && press.scale,
          (disabled || loading) && styles.disabled,
          style,
        ]}
      >
        <Text style={[styles.label, { color: colors.text }]} maxFontSizeMultiplier={fontScale.display}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        gradientShadow.glowSm,
        pressed && press.scale,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <View style={styles.base}>
        <LiquidGradient variant="button" borderRadius={radius.lg} />
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.label, { color: "#fff" }]} maxFontSizeMultiplier={fontScale.display}>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** Small inline "+ Add" style action, tinted accent. */
export function InlineAction({
  label,
  onPress,
  disabled = false,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.inline,
        { backgroundColor: colors.accentSoft },
        pressed && press.scale,
        disabled && styles.disabled,
      ]}
    >
      {children}
      <Text style={[styles.inlineLabel, { color: colors.accent }]} maxFontSizeMultiplier={fontScale.compact}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...type.button },
  disabled: { opacity: 0.5 },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  inlineLabel: {
    ...type.caption,
    fontFamily: fonts.semibold,
    fontWeight: "600",
  },
});
