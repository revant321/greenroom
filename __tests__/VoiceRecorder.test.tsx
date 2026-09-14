import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { VoiceRecorder } from "@/components/VoiceRecorder";

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

jest.mock("@/theme/useTheme", () => ({
  useTheme: () => ({
    colors: { text: "#000", textMuted: "#666", accent: "#8c5cff" },
  }),
}));

const mockRecorder = {
  prepareToRecordAsync: jest.fn(async () => {}),
  record: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(async () => {}),
  uri: "file:///tmp/take.m4a",
};

let mockRecorderState = { isRecording: true, durationMillis: 0, metering: -20 };

jest.mock("expo-audio", () => ({
  AudioModule: {
    requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(async () => {}),
  useAudioRecorder: () => mockRecorder,
  useAudioRecorderState: () => mockRecorderState,
}));

async function renderRecorder() {
  const onFinish = jest.fn();
  const onCancel = jest.fn();
  const utils = render(<VoiceRecorder onFinish={onFinish} onCancel={onCancel} />);
  await waitFor(() => expect(mockRecorder.record).toHaveBeenCalledTimes(1));
  return { ...utils, onFinish, onCancel };
}

describe("VoiceRecorder pause / resume", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorderState = { isRecording: true, durationMillis: 0, metering: -20 };
  });

  test("starts recording on open and offers a Pause button", async () => {
    const { getByText, getByLabelText } = await renderRecorder();
    expect(getByText("RECORDING")).toBeTruthy();
    expect(getByLabelText("Pause recording")).toBeTruthy();
    expect(getByText("Done")).toBeTruthy();
  });

  test("pause and resume call the native recorder and flip the label", async () => {
    const { getByText, getByLabelText } = await renderRecorder();

    await act(async () => {
      fireEvent.press(getByLabelText("Pause recording"));
    });
    expect(mockRecorder.pause).toHaveBeenCalledTimes(1);
    expect(getByText("PAUSED")).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText("Resume recording"));
    });
    // record() once on open, once to resume — same file, no re-prepare.
    expect(mockRecorder.record).toHaveBeenCalledTimes(2);
    expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);
    expect(getByText("RECORDING")).toBeTruthy();
  });

  test("pausing and immediately saving stops and returns the file", async () => {
    const { getByLabelText, onFinish, onCancel } = await renderRecorder();

    await act(async () => {
      fireEvent.press(getByLabelText("Pause recording"));
    });
    await act(async () => {
      fireEvent.press(getByLabelText("Done"));
    });

    expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith("file:///tmp/take.m4a");
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("timer shows the recorder's accumulated duration", async () => {
    mockRecorderState = { isRecording: false, durationMillis: 65_000, metering: -160 };
    const { getByText } = await renderRecorder();
    expect(getByText("1:05")).toBeTruthy();
  });
});
