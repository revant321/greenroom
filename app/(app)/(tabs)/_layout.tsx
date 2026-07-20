import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { FloatingGlassTabBar } from "@/components/FloatingGlassTabBar";
import { useTheme } from "@/theme/useTheme";

function ShowsIcon({ color, size }: { color: string; size: number }) {
  // theatermasks has more built-in padding than music.note, so it needs a
  // few extra points to look the same size on screen.
  if (Platform.OS === "ios") {
    return <SymbolView name="theatermasks" size={size + 4} tintColor={color} />;
  }
  return <Ionicons name="film-outline" size={size + 4} color={color} />;
}

function SongsIcon({ color, size }: { color: string; size: number }) {
  if (Platform.OS === "ios") {
    return <SymbolView name="music.note" size={size} tintColor={color} />;
  }
  return <Ionicons name="musical-notes-outline" size={size} color={color} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="shows"
        options={{
          title: "Shows",
          tabBarIcon: ({ color, size }) => <ShowsIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="songs"
        options={{
          title: "Songs",
          tabBarIcon: ({ color, size }) => <SongsIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
