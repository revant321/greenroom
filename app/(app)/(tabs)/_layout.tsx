import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Easing, Platform } from "react-native";
import { FloatingGlassTabBar } from "@/components/FloatingGlassTabBar";
import { useTheme } from "@/theme/useTheme";

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
  const { speed } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: "shift",
        transitionSpec: {
          animation: "timing",
          config: {
            duration: 280 * speed,
            easing: Easing.out(Easing.cubic),
          },
        },
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
