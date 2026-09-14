import { StyleProp, ViewStyle } from "react-native";
import { IconButton } from "./IconButton";
import { confirm } from "@/utils/confirm";
import { useTheme } from "@/theme/useTheme";

/**
 * The one way to delete anything in the app: a trash icon that always asks
 * first via the native confirm dialog. Describe what's lost in `message`
 * (especially when the delete cascades); the defaults cover a single item.
 */
export function DeleteButton({
  onConfirm,
  title = "Delete this?",
  message = "This can't be undone.",
  confirmLabel = "Delete",
  label = "Delete",
  size = 20,
  style,
}: {
  onConfirm: () => void;
  title?: string;
  message?: string;
  /** Text on the red button inside the dialog. */
  confirmLabel?: string;
  /** VoiceOver label for the trash icon. */
  label?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <IconButton
      sf="trash"
      ion="trash-outline"
      size={size}
      color={colors.danger}
      label={label}
      onPress={() => confirm(title, message, onConfirm, confirmLabel)}
      style={style}
    />
  );
}
