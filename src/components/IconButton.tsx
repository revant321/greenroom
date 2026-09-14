import { ComponentProps } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Icon } from "./Icon";
import { press } from "@/theme/tokens";

const MIN_TARGET = 44;

/**
 * Icon-only button. `label` is required so VoiceOver has something to
 * read; hitSlop pads the touch target out to 44pt regardless of icon size;
 * and it shrinks/dims while pressed like every other icon control.
 */
export function IconButton({
  sf,
  ion,
  label,
  onPress,
  color,
  size = 22,
  disabled = false,
  style,
}: {
  sf: string;
  ion: ComponentProps<typeof Icon>["ion"];
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const slop = Math.max(0, Math.ceil((MIN_TARGET - size) / 2));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      style={({ pressed }) => [
        pressed && press.icon,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon sf={sf} ion={ion} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
});
