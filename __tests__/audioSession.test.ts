import { setAudioModeAsync } from "expo-audio";
import { enterRecordingMode, exitRecordingMode } from "@/lib/audioSession";

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockSetMode = setAudioModeAsync as jest.Mock;

describe("audioSession", () => {
  beforeEach(() => jest.clearAllMocks());

  test("enterRecordingMode turns recording on and keeps silent-mode playback", async () => {
    await enterRecordingMode();
    expect(mockSetMode).toHaveBeenCalledWith({
      allowsRecording: true,
      playsInSilentMode: true,
    });
  });

  test("exitRecordingMode turns recording off and keeps silent-mode playback", async () => {
    await exitRecordingMode();
    expect(mockSetMode).toHaveBeenCalledWith({
      allowsRecording: false,
      playsInSilentMode: true,
    });
  });

  test("exitRecordingMode never throws, even if the native call fails", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockSetMode.mockRejectedValueOnce(new Error("boom"));
    await expect(exitRecordingMode()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
