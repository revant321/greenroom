import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "./Icon";
import { useTheme } from "@/theme/useTheme";

export function SettingsButton() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push("/settings")}
      hitSlop={12}
      accessibilityLabel="Settings"
      style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon sf="gearshape" ion="settings-outline" size={22} color={colors.text} />
    </Pressable>
  );
}
