import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { spacing, type } from "@/theme/tokens";

type ToastKind = "info" | "error" | "success";
type Toast = { id: number; message: string; kind: ToastKind };
type ToastContextValue = { show: (message: string, kind?: ToastKind) => void };

const Ctx = createContext<ToastContextValue | null>(null);

export function useToast() {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return value;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const idRef = useRef(0);

  const show = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = ++idRef.current;
      setToast({ id, message, kind });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        if (idRef.current !== id) return;
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 2400);
    },
    [opacity],
  );

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && <ToastView toast={toast} opacity={opacity} />}
    </Ctx.Provider>
  );
}

function ToastView({
  toast,
  opacity,
}: {
  toast: Toast;
  opacity: Animated.Value;
}) {
  const { colors } = useTheme();
  const bg =
    toast.kind === "error"
      ? colors.danger
      : toast.kind === "success"
        ? colors.success
        : colors.bgElevated;
  const fg = toast.kind === "info" ? colors.text : "#fff";
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity, backgroundColor: bg }]}
    >
      <Text style={[styles.text, { color: fg }]}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 120,
    left: spacing.xl,
    right: spacing.xl,
    padding: spacing.md + 2,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: { ...type.body, textAlign: "center" },
});
