import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";
import {
  TAB_BAR_BOTTOM_INSET,
  TAB_BAR_HEIGHT,
  TAB_BAR_HORIZONTAL_MARGIN,
  TAB_BAR_WIDTH_FRACTION,
  radius,
  type,
} from "@/theme/tokens";

export function FloatingGlassTabBar({
  state,
  descriptors,
  navigation,
  position,
}: MaterialTopTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const sidePadding = 5;
  const pillWidth =
    (screenWidth - TAB_BAR_HORIZONTAL_MARGIN * 2) * TAB_BAR_WIDTH_FRACTION;
  const innerWidth = pillWidth - sidePadding * 2;
  const tabCount = state.routes.length;
  const tabWidth = innerWidth / tabCount;

  // `position` is the pager's live page index (0..tabCount-1), including
  // mid-swipe fractions — so the lozenge tracks the finger during a swipe.
  const translateX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: TAB_BAR_BOTTOM_INSET + insets.bottom * 0.4 },
      ]}
    >
      <BlurView
        intensity={100}
        tint={colors.navBlurTint}
        style={[
          styles.pill,
          {
            width: pillWidth,
            backgroundColor: colors.navGlassTint,
            borderColor: colors.navGlassBorder,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.activePill,
            {
              width: tabWidth,
              backgroundColor: colors.navActivePill,
              borderColor: colors.navActivePillBorder,
              transform: [{ translateX }],
            },
          ]}
          pointerEvents="none"
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              (navigation as any).navigate(route.name, route.params);
            }
          };

          const tintColor = focused ? colors.navIconActive : colors.navIconInactive;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={
                typeof options.tabBarAccessibilityLabel === "string"
                  ? options.tabBarAccessibilityLabel
                  : label
              }
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                { width: tabWidth },
                pressed && { opacity: 0.85 },
              ]}
            >
              {options.tabBarIcon?.({ focused, color: tintColor })}
              <Text
                style={[
                  styles.label,
                  type.tabLabel,
                  { color: tintColor, opacity: focused ? 1 : 0.7 },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  pill: {
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  activePill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    zIndex: 1,
  },
  label: {
    marginTop: -2,
    letterSpacing: 0.2,
  },
});
