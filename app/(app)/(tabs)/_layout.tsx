import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { FloatingGlassTabBar } from "@/components/FloatingGlassTabBar";

function ShowsIcon({ color }: { color: string }) {
  if (Platform.OS === "ios") {
    return <SymbolView name="theatermasks" size={28} tintColor={color} />;
  }
  return <Ionicons name="film-outline" size={28} color={color} />;
}

function SongsIcon({ color }: { color: string }) {
  if (Platform.OS === "ios") {
    return <SymbolView name="music.note" size={28} tintColor={color} />;
  }
  return <Ionicons name="musical-notes-outline" size={28} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingGlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="shows"
        options={{
          title: "Shows",
          tabBarIcon: ({ color }) => <ShowsIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="songs"
        options={{
          title: "Songs",
          tabBarIcon: ({ color }) => <SongsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
