import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ColorTokens, palette } from "./tokens";

export type ThemeMode = "auto" | "light" | "dark";
export type AnimSpeed = "slower" | "normal" | "faster";

const STORAGE_KEY = "greenroom.theme-mode";
const SPEED_KEY = "greenroom.anim-speed";

/** Duration multiplier per speed setting (matches the design prototype). */
export const SPEED_MULT: Record<AnimSpeed, number> = {
  slower: 1.7,
  normal: 1,
  faster: 0.55,
};

export type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  scheme: "light" | "dark";
  colors: ColorTokens;
  animSpeed: AnimSpeed;
  setAnimSpeed: (s: AnimSpeed) => void;
  /** Multiply any animation duration by this. */
  speed: number;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [animSpeed, setAnimSpeedState] = useState<AnimSpeed>("normal");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((value) => {
      if (value === "auto" || value === "light" || value === "dark") {
        setModeState(value);
      }
    });
    SecureStore.getItemAsync(SPEED_KEY).then((value) => {
      if (value === "slower" || value === "normal" || value === "faster") {
        setAnimSpeedState(value);
      }
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSystemScheme(colorScheme),
    );
    return () => sub.remove();
  }, []);

  const scheme: "light" | "dark" =
    mode === "auto" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  function setMode(next: ThemeMode) {
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }

  function setAnimSpeed(next: AnimSpeed) {
    setAnimSpeedState(next);
    SecureStore.setItemAsync(SPEED_KEY, next).catch(() => {});
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        scheme,
        colors: palette[scheme],
        animSpeed,
        setAnimSpeed,
        speed: SPEED_MULT[animSpeed],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
