import { Stack } from "expo-router";
import { SettingsButton } from "@/components/SettingsButton";

export default function ShowsStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Shows",
          headerRight: () => <SettingsButton />,
        }}
      />
      <Stack.Screen
        name="new"
        options={{ presentation: "modal", title: "New Show" }}
      />
      <Stack.Screen name="completed" options={{ title: "Completed" }} />
      <Stack.Screen name="[showId]/index" options={{ title: "" }} />
      <Stack.Screen
        name="[showId]/musical-numbers/index"
        options={{ title: "Musical Numbers" }}
      />
      <Stack.Screen
        name="[showId]/musical-numbers/new"
        options={{ presentation: "modal", title: "New Musical Number" }}
      />
      <Stack.Screen
        name="[showId]/musical-numbers/[numberId]"
        options={{ title: "" }}
      />
      <Stack.Screen
        name="[showId]/scenes/index"
        options={{ title: "Scenes" }}
      />
      <Stack.Screen
        name="[showId]/scenes/new"
        options={{ presentation: "modal", title: "New Scene" }}
      />
      <Stack.Screen
        name="[showId]/scenes/[sceneId]"
        options={{ title: "" }}
      />
    </Stack>
  );
}
