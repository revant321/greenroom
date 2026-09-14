import React from "react";
import { Appearance, Pressable, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useTheme } from "@/theme/useTheme";

jest.mock("expo-secure-store");

function Probe() {
  const { mode, scheme, setMode } = useTheme();
  return (
    <>
      <Text testID="state">{`${mode}/${scheme}`}</Text>
      <Pressable onPress={() => setMode("light")}>
        <Text>light</Text>
      </Pressable>
      <Pressable onPress={() => setMode("dark")}>
        <Text>dark</Text>
      </Pressable>
      <Pressable onPress={() => setMode("auto")}>
        <Text>auto</Text>
      </Pressable>
    </>
  );
}

describe("ThemeProvider", () => {
  let setColorScheme: jest.SpyInstance;
  let getColorScheme: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    setColorScheme = jest
      .spyOn(Appearance, "setColorScheme")
      .mockImplementation(() => {});
    getColorScheme = jest
      .spyOn(Appearance, "getColorScheme")
      .mockReturnValue("dark");
  });

  afterEach(() => {
    setColorScheme.mockRestore();
    getColorScheme.mockRestore();
  });

  test("System mode follows the phone and clears the native override", async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(getByTestId("state").props.children).toBe("auto/dark"));
    expect(setColorScheme).toHaveBeenCalledWith(null);
    expect(setColorScheme).not.toHaveBeenCalledWith("light");
    expect(setColorScheme).not.toHaveBeenCalledWith("dark");
  });

  test("picking Light on a dark phone forces light for app and native chrome", async () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(getByTestId("state").props.children).toBe("auto/dark"));

    fireEvent.press(getByText("light"));

    await waitFor(() => expect(getByTestId("state").props.children).toBe("light/light"));
    expect(setColorScheme).toHaveBeenLastCalledWith("light");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "greenroom.theme-mode",
      "light",
    );
  });

  test("switching back to System re-reads the phone appearance", async () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(getByTestId("state").props.children).toBe("auto/dark"));

    fireEvent.press(getByText("light"));
    await waitFor(() => expect(getByTestId("state").props.children).toBe("light/light"));

    getColorScheme.mockReturnValue("light");
    fireEvent.press(getByText("auto"));

    await waitFor(() => expect(getByTestId("state").props.children).toBe("auto/light"));
    expect(setColorScheme).toHaveBeenLastCalledWith(null);
  });

  test("a saved Dark preference is restored and applied natively", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(key === "greenroom.theme-mode" ? "dark" : null),
    );
    getColorScheme.mockReturnValue("light");

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await waitFor(() => expect(getByTestId("state").props.children).toBe("dark/dark"));
    expect(setColorScheme).toHaveBeenLastCalledWith("dark");
  });
});
