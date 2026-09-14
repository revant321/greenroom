import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { setAudioModeAsync } from "expo-audio";
import { VoiceRecorder } from "@/components/VoiceRecorder";

const mockRecorder = {
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  uri: "file:///tmp/take.m4a",
};

jest.mock("expo-audio", () => ({
  AudioModule: {
    requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  useAudioRecorder: () => mockRecorder,
  useAudioRecorderState: () => ({
    isRecording: true,
    metering: -20,
    durationMillis: 0,
  }),
}));

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

jest.mock("@/theme/useTheme", () => ({
  useTheme: () => ({
    colors: { text: "#000", textMuted: "#666", accent: "#f0f" },
  }),
}));

const mockSetMode = setAudioModeAsync as jest.Mock;
const RECORD_ON = { allowsRecording: true, playsInSilentMode: true };
const RECORD_OFF = { allowsRecording: false, playsInSilentMode: true };

async function renderRecording() {
  const onFinish = jest.fn();
  const onCancel = jest.fn();
  const utils = render(<VoiceRecorder onFinish={onFinish} onCancel={onCancel} />);
  await waitFor(() => expect(mockRecorder.record).toHaveBeenCalled());
  expect(mockSetMode).toHaveBeenCalledWith(RECORD_ON);
  return { ...utils, onFinish, onCancel };
}

describe("VoiceRecorder audio session", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorder.stop.mockResolvedValue(undefined);
  });

  test("restores the session after Save", async () => {
    const { getByText, onFinish } = await renderRecording();
    await act(async () => {
      fireEvent.press(getByText("Save"));
    });
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith("file:///tmp/take.m4a"));
    expect(mockSetMode).toHaveBeenLastCalledWith(RECORD_OFF);
  });

  test("restores the session after Cancel", async () => {
    const { getByText, onCancel } = await renderRecording();
    await act(async () => {
      fireEvent.press(getByText("Cancel"));
    });
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
    expect(mockSetMode).toHaveBeenLastCalledWith(RECORD_OFF);
  });

  test("restores the session on unmount mid-recording", async () => {
    const { unmount } = await renderRecording();
    await act(async () => {
      unmount();
    });
    await waitFor(() => expect(mockSetMode).toHaveBeenLastCalledWith(RECORD_OFF));
  });

  test("still restores the session if stop() throws", async () => {
    const { getByText, onFinish } = await renderRecording();
    mockRecorder.stop.mockRejectedValueOnce(new Error("already stopped"));
    await act(async () => {
      fireEvent.press(getByText("Save"));
    });
    await waitFor(() => expect(onFinish).toHaveBeenCalled());
    expect(mockSetMode).toHaveBeenLastCalledWith(RECORD_OFF);
  });
});
