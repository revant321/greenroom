import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";
import { fonts } from "@/theme/tokens";

/**
 * Prototype bottom sheet: dimmed + blurred backdrop, card slides up with
 * an eased curve (380ms) and slides back down on dismiss (300ms) while the
 * backdrop un-dims — never a hard disappear.
 *
 * Usage: keep `open` in state; the sheet plays its exit animation before
 * `onClose` fires.
 */
const EASE_IN = Easing.bezier(0.22, 0.9, 0.32, 1);
const EASE_OUT = Easing.bezier(0.4, 0, 0.9, 0.5);

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const { colors, speed } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: 380 * speed,
        easing: EASE_IN,
      });
    } else if (mounted) {
      Keyboard.dismiss();
      progress.value = withTiming(
        0,
        { duration: 300 * speed, easing: EASE_OUT },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * height * 0.6 }],
  }));

  const requestClose = useCallback(() => onClose(), [onClose]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={requestClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable style={styles.fill} onPress={requestClose}>
            <BlurView
              intensity={22}
              tint="dark"
              style={[styles.fill, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            />
          </Pressable>
        </Animated.View>
        <View style={styles.bottom} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 16) + 24,
              },
              cardStyle,
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
            {title ? (
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            ) : null}
            {children}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
  },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 99,
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.extrabold,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 16,
  },
});
