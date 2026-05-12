import { Stack } from "expo-router";
import { SettingsButton } from "@/components/SettingsButton";

export default function SongsStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Songs",
          headerRight: () => <SettingsButton />,
        }}
      />
      <Stack.Screen
        name="new"
        options={{ presentation: "modal", title: "New Song" }}
      />
      <Stack.Screen name="[songId]" options={{ title: "" }} />
    </Stack>
  );
}
