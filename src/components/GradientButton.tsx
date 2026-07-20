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
import { fonts, radius } from "@/theme/tokens";

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
        style={({ pressed }) => [
          styles.base,
          { backgroundColor: colors.accentSoft },
          pressed && styles.pressed,
          (disabled || loading) && styles.disabled,
          style,
        ]}
      >
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        gradientShadow.glowSm,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <View style={styles.base}>
        <LiquidGradient variant="button" borderRadius={radius.lg} />
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.label, { color: "#fff" }]}>{label}</Text>
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
      style={({ pressed }) => [
        styles.inline,
        { backgroundColor: colors.accentSoft },
        pressed && { transform: [{ scale: 0.95 }] },
        disabled && styles.disabled,
      ]}
    >
      {children}
      <Text style={[styles.inlineLabel, { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
  },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.5 },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  inlineLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    fontWeight: "600",
  },
});
