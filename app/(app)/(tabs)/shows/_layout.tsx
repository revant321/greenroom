import { Stack } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { fonts } from "@/theme/tokens";

export default function ShowsStackLayout() {
  const { colors } = useTheme();
  const header = {
    headerStyle: { backgroundColor: colors.bg },
    headerShadowVisible: false,
    headerTintColor: colors.accent,
    headerTitleStyle: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontWeight: "600" as const,
    },
  };

  return (
    <Stack screenOptions={header}>
      {/* Index draws its own large title + settings gear */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="new"
        options={{ presentation: "modal", title: "New Show" }}
      />
      <Stack.Screen
        name="complete"
        options={{ presentation: "modal", title: "Complete show" }}
      />
      <Stack.Screen name="completed" options={{ title: "Trophy Case" }} />
      <Stack.Screen name="[showId]/index" options={{ title: "" }} />
      <Stack.Screen
        name="[showId]/musical-numbers/index"
        options={{ title: "" }}
      />
      <Stack.Screen
        name="[showId]/musical-numbers/new"
        options={{ presentation: "modal", title: "New Musical Number" }}
      />
      <Stack.Screen
        name="[showId]/musical-numbers/[numberId]"
        options={{ title: "" }}
      />
      <Stack.Screen name="[showId]/scenes/index" options={{ title: "" }} />
      <Stack.Screen
        name="[showId]/scenes/new"
        options={{ presentation: "modal", title: "New Scene" }}
      />
      <Stack.Screen name="[showId]/scenes/[sceneId]" options={{ title: "" }} />
    </Stack>
  );
}
