import { Stack } from "expo-router";

export default function SongsStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Songs" }} />
      <Stack.Screen
        name="new"
        options={{ presentation: "modal", title: "New Song" }}
      />
      <Stack.Screen name="[songId]" options={{ title: "" }} />
    </Stack>
  );
}
