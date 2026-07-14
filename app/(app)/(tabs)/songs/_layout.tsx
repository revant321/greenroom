import { Stack } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { fonts } from "@/theme/tokens";

export default function SongsStackLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        headerTitleStyle: {
          color: colors.text,
          fontFamily: fonts.semibold,
          fontWeight: "600" as const,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="new"
        options={{ presentation: "modal", title: "New Song" }}
      />
      <Stack.Screen name="[songId]" options={{ title: "" }} />
    </Stack>
  );
}
