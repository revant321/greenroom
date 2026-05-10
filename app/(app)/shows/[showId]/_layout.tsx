import { Stack } from "expo-router";

export default function ShowLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "" }} />
      <Stack.Screen
        name="musical-numbers/index"
        options={{ title: "Musical Numbers" }}
      />
      <Stack.Screen
        name="musical-numbers/new"
        options={{ presentation: "modal", title: "New Musical Number" }}
      />
      <Stack.Screen name="musical-numbers/[numberId]" options={{ title: "" }} />
      <Stack.Screen name="scenes/index" options={{ title: "Scenes" }} />
      <Stack.Screen
        name="scenes/new"
        options={{ presentation: "modal", title: "New Scene" }}
      />
      <Stack.Screen name="scenes/[sceneId]" options={{ title: "" }} />
    </Stack>
  );
}
