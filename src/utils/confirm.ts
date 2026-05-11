import { Alert } from "react-native";

export function confirm(
  title: string,
  message: string,
  onConfirm: () => void,
  destructiveLabel = "Delete",
) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: destructiveLabel, style: "destructive", onPress: onConfirm },
  ]);
}
