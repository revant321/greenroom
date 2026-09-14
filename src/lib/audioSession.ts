import { setAudioModeAsync } from "expo-audio";

/**
 * The one place that knows how to move the iOS audio session into and out
 * of record mode.
 *
 * `allowsRecording: true` switches iOS to the PlayAndRecord category, which
 * routes sound to the earpiece and caps the volume. If nobody switches it
 * back, every harmony and video played afterwards is quiet and thin until
 * the app is force-quit (#59 / #26). Callers must pair enterRecordingMode()
 * with exitRecordingMode() — the recorder does this in a finally block so a
 * failed stop still restores playback.
 *
 * `playsInSilentMode` stays on in both states: a user with the ringer switch
 * off still expects to hear their harmony playback.
 */
export async function enterRecordingMode(): Promise<void> {
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
}

/**
 * Never throws: a failed restore is logged, not surfaced, so the recorder UI
 * can always finish saving or cancelling.
 */
export async function exitRecordingMode(): Promise<void> {
  try {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  } catch (err) {
    console.warn("Failed to restore audio session after recording", err);
  }
}
