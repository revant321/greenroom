import { createContext, ReactNode, useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ColorTokens, palette } from "./tokens";

export type ThemeMode = "auto" | "light" | "dark";
const STORAGE_KEY = "greenroom.theme-mode";

export type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  scheme: "light" | "dark";
  colors: ColorTokens;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((value) => {
      if (value === "auto" || value === "light" || value === "dark") {
        setModeState(value);
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

  return (
    <ThemeContext.Provider
      value={{ mode, setMode, scheme, colors: palette[scheme] }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
