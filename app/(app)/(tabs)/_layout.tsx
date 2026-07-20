import { withLayoutContext } from "expo-router";
import {
  createMaterialTopTabNavigator,
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
} from "@react-navigation/material-top-tabs";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { FloatingGlassTabBar } from "@/components/FloatingGlassTabBar";
import { useTheme } from "@/theme/useTheme";

/**
 * Bottom tabs can't swipe between pages. Material top tabs use a native
 * pager (react-native-pager-view), so we use that navigator instead, pin
 * its bar to the bottom, and keep our custom glass pill as the tab bar.
 */
const { Navigator } = createMaterialTopTabNavigator();
const Tabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

const ICON_SIZE = 30;

function ShowsIcon({ color }: { color: string }) {
  // theatermasks has more built-in padding than music.note, so it needs a
  // few extra points to look the same size on screen.
  if (Platform.OS === "ios") {
    return (
      <SymbolView name="theatermasks" size={ICON_SIZE + 4} tintColor={color} />
    );
  }
  return <Ionicons name="film-outline" size={ICON_SIZE + 4} color={color} />;
}

function SongsIcon({ color }: { color: string }) {
  if (Platform.OS === "ios") {
    return <SymbolView name="music.note" size={ICON_SIZE} tintColor={color} />;
  }
  return <Ionicons name="musical-notes-outline" size={ICON_SIZE} color={color} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBarPosition="bottom"
      tabBar={(props) => <FloatingGlassTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        sceneStyle: { backgroundColor: colors.bg },
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
