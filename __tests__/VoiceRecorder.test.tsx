import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import { AudioModule, setAudioModeAsync } from "expo-audio";
import { VoiceRecorder } from "@/components/VoiceRecorder";

const TAKE_URI = "file:///cache/take.m4a";

const mockRecorder = {
  uri: TAKE_URI,
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
};
const mockState = {
  canRecord: true,
  isRecording: true,
  durationMillis: 0,
  mediaServicesDidReset: false,
  metering: undefined as number | undefined,
  url: TAKE_URI,
};

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("@/theme/useTheme", () => ({
  useTheme: () => ({
    colors: { text: "#000", textMuted: "#666", accent: "#f0f" },
  }),
}));
jest.mock("expo-audio", () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn() },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  useAudioRecorder: () => mockRecorder,
  useAudioRecorderState: () => mockState,
}));
jest.mock("expo-file-system/legacy", () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getFreeDiskStorageAsync: jest.fn().mockResolvedValue(10 * 1024 * 1024 * 1024),
}));
jest.mock("expo-linking", () => ({
  openSettings: jest.fn().mockResolvedValue(undefined),
}));

const requestPerm = AudioModule.requestRecordingPermissionsAsync as jest.Mock;
const deleteAsync = FileSystem.deleteAsync as jest.Mock;
const getFreeDiskStorageAsync = FileSystem.getFreeDiskStorageAsync as jest.Mock;
const mockSetMode = setAudioModeAsync as jest.Mock;
const RECORD_ON = { allowsRecording: true, playsInSilentMode: true };
const RECORD_OFF = { allowsRecording: false, playsInSilentMode: true };

function lastAlert() {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const [title, message, buttons] = calls[calls.length - 1];
  return { title, message, buttons: (buttons ?? []) as { text: string; onPress?: () => void }[] };
}

function renderRecorder(maxDurationSeconds?: number) {
  const onFinish = jest.fn();
  const onCancel = jest.fn();
  const utils = render(
    <VoiceRecorder
      onFinish={onFinish}
      onCancel={onCancel}
      maxDurationSeconds={maxDurationSeconds}
    />,
  );
  const rerender = () =>
    utils.rerender(
      <VoiceRecorder
        onFinish={onFinish}
        onCancel={onCancel}
        maxDurationSeconds={maxDurationSeconds}
      />,
    );
  return { ...utils, onFinish, onCancel, rerender };
}

async function startRecording(maxDurationSeconds?: number) {
  const r = renderRecorder(maxDurationSeconds);
  await waitFor(() => expect(mockRecorder.record).toHaveBeenCalled());
  expect(mockSetMode).toHaveBeenCalledWith(RECORD_ON);
  return r;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  requestPerm.mockResolvedValue({ granted: true, canAskAgain: true });
  mockRecorder.stop.mockResolvedValue(undefined);
  mockState.isRecording = true;
  mockState.durationMillis = 0;
});

describe("VoiceRecorder", () => {
  test("starts with the native duration cap", async () => {
    await startRecording();
    expect(mockRecorder.record).toHaveBeenCalledWith({ forDuration: 600 });
  });

  test("cancelling a short take deletes the file without asking", async () => {
    const { onCancel, onFinish, getByText } = await startRecording();
    mockState.durationMillis = 1200;
    fireEvent.press(getByText("Cancel"));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(mockRecorder.stop).toHaveBeenCalled();
    expect(deleteAsync).toHaveBeenCalledWith(TAKE_URI, { idempotent: true });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  test("cancelling a real take asks first, then deletes on Discard", async () => {
    const { onCancel, getByText, rerender } = await startRecording();
    mockState.durationMillis = 8000;
    rerender();
    fireEvent.press(getByText("Cancel"));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const { title, buttons } = lastAlert();
    expect(title).toBe("Discard recording?");
    expect(deleteAsync).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    const discard = buttons.find((b) => b.text === "Discard");
    await act(async () => {
      discard?.onPress?.();
    });
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(deleteAsync).toHaveBeenCalledWith(TAKE_URI, { idempotent: true });
  });

  test("saving hands the file to onFinish and keeps it", async () => {
    const { onFinish, onCancel, getByText } = await startRecording();
    fireEvent.press(getByText("Save"));
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith(TAKE_URI));
    expect(deleteAsync).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("auto-saves when the recorder stops at the max duration", async () => {
    const { onFinish, rerender } = await startRecording(5);
    expect(mockRecorder.record).toHaveBeenCalledWith({ forDuration: 5 });
    mockState.isRecording = false;
    rerender();
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith(TAKE_URI));
    expect(deleteAsync).not.toHaveBeenCalled();
  });

  test("shows a countdown in the last 30 seconds", async () => {
    const { getByText, rerender } = await startRecording(60);
    mockState.durationMillis = 40_000;
    rerender();
    getByText("RECORDING · 0:20 LEFT");
  });

  test("unmounting an unsaved take deletes the file", async () => {
    const { unmount, onFinish, onCancel } = await startRecording();
    unmount();
    await waitFor(() =>
      expect(deleteAsync).toHaveBeenCalledWith(TAKE_URI, { idempotent: true }),
    );
    expect(onFinish).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("unmounting after Save does not delete the file", async () => {
    const { unmount, onFinish, getByText } = await startRecording();
    fireEvent.press(getByText("Save"));
    await waitFor(() => expect(onFinish).toHaveBeenCalled());
    unmount();
    expect(deleteAsync).not.toHaveBeenCalled();
  });

  test("a permanently denied permission offers Open Settings", async () => {
    requestPerm.mockResolvedValue({ granted: false, canAskAgain: false });
    const { onCancel } = renderRecorder();
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(mockRecorder.record).not.toHaveBeenCalled();

    const { buttons } = lastAlert();
    const open = buttons.find((b) => b.text === "Open Settings");
    expect(open).toBeDefined();
    open?.onPress?.();
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  test("a denial that can be re-asked does not offer Open Settings", async () => {
    requestPerm.mockResolvedValue({ granted: false, canAskAgain: true });
    const { onCancel } = renderRecorder();
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    const { buttons } = lastAlert();
    expect(buttons.map((b) => b.text)).toEqual(["OK"]);
  });

  test("refuses to start when free space is low", async () => {
    getFreeDiskStorageAsync.mockResolvedValueOnce(5 * 1024 * 1024);
    const { onCancel } = renderRecorder();
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(lastAlert().title).toBe("Not enough storage");
    expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
    expect(mockRecorder.record).not.toHaveBeenCalled();
    expect(mockSetMode).not.toHaveBeenCalledWith(RECORD_ON);
  });

  test("still records when the free-space check is unavailable", async () => {
    getFreeDiskStorageAsync.mockRejectedValueOnce(new Error("unsupported"));
    await startRecording();
    expect(mockRecorder.record).toHaveBeenCalled();
  });
});

describe("VoiceRecorder audio session", () => {
  test("restores the session after Save", async () => {
    const { getByText, onFinish } = await startRecording();
    await act(async () => {
      fireEvent.press(getByText("Save"));
    });
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith(TAKE_URI));
    expect(mockSetMode).toHaveBeenLastCalledWith(RECORD_OFF);
  });

  test("restores the session after Cancel", async () => {
    const { getByText, onCancel } = await startRecording();
    await act(async () => {
      fireEvent.press(getByText("Cancel"));
    });
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
    expect(mockSetMode).toHaveBeenLastCalledWith(RECORD_OFF);
  });

  test("restores the session on unmount mid-recording", async () => {
    const { unmount } = await startRecording();
    await act(async () => {
      unmount();
    });
    await waitFor(() => expect(mockSetMode).toHaveBeenLastCalledWith(RECORD_OFF));
  });

  test("still restores the session if stop() throws", async () => {
    const { getByText, onFinish } = await startRecording();
    mockRecorder.stop.mockRejectedValueOnce(new Error("already stopped"));
    await act(async () => {
      fireEvent.press(getByText("Save"));
    });
    await waitFor(() => expect(onFinish).toHaveBeenCalled());
    expect(mockSetMode).toHaveBeenLastCalledWith(RECORD_OFF);
  });
});
