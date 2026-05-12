import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import {
  TAB_BAR_BOTTOM_INSET,
  TAB_BAR_HEIGHT,
  TAB_BAR_HORIZONTAL_MARGIN,
  radius,
  type,
} from "@/theme/tokens";

export function FloatingGlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const sidePadding = 6;
  const innerWidth =
    screenWidth - TAB_BAR_HORIZONTAL_MARGIN * 2 - sidePadding * 2;
  const tabCount = state.routes.length;
  const tabWidth = innerWidth / tabCount;

  const activeX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    activeX.value = withSpring(state.index * tabWidth, {
      stiffness: 380,
      damping: 30,
    });
  }, [state.index, tabWidth, activeX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeX.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: TAB_BAR_BOTTOM_INSET + insets.bottom * 0.4,
          left: TAB_BAR_HORIZONTAL_MARGIN,
          right: TAB_BAR_HORIZONTAL_MARGIN,
        },
      ]}
    >
      <BlurView
        intensity={70}
        tint={colors.navBlurTint}
        style={[
          styles.pill,
          {
            backgroundColor: colors.navGlassTint,
            borderColor: colors.navGlassBorder,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.activePill,
            {
              width: tabWidth + 8,
              backgroundColor: colors.navActivePill,
              borderColor: colors.navActivePillBorder,
            },
            pillStyle,
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
              {options.tabBarIcon?.({
                focused,
                color: tintColor,
                size: 28,
              })}
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
    zIndex: 50,
  },
  pill: {
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  activePill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 2,
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
