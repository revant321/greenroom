import { useEffect, useRef, useState } from "react";
import { Alert, AlertButton, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import { fonts } from "@/theme/tokens";
import { enterRecordingMode, exitRecordingMode } from "@/lib/audioSession";
import { confirm } from "@/utils/confirm";

/**
 * Voice Memos–style recorder (prototype port).
 * - Live amplitude waveform: bar height = input loudness, newest sample
 *   scrolls in from the right (falls back to a simulated envelope when
 *   metering is unavailable).
 * - Large thin timer, pulsing red pause/resume button, Cancel / Done.
 * - Pause and resume continue into the same file: the native recorder
 *   (AVAudioRecorder) handles it and expo-audio reports the accumulated
 *   duration, so the timer never counts wall-clock time while paused (#61).
 * - Same props as the old AudioRecorder, so callers are unchanged.
 *   Present inside <Sheet> (see screens) rather than a full-screen modal.
 *
 * Lifecycle guarantees (see GitHub issues #59 and #65):
 * - Exactly one of onFinish / onCancel fires, at most once.
 * - The iOS audio session leaves record mode on every exit path, even if
 *   stop() throws, so later playback isn't quiet.
 * - A take that isn't saved (Cancel, unmount, permission or storage
 *   failure) has its temp file deleted so nothing lingers in the cache.
 * - Recording stops on its own at `maxDurationSeconds` and what was
 *   captured is saved.
 */
const BAR_COUNT = 44;
const REC_RED = "#FF5C7A";

export const DEFAULT_MAX_DURATION_SECONDS = 10 * 60;
const WARN_BEFORE_END_SECONDS = 30;
// Cancelling a take shorter than this is cheap to redo, so skip the confirm.
const CONFIRM_DISCARD_AFTER_MS = 3000;
// HIGH_QUALITY AAC is roughly 1 MB/minute; a full take plus the copy that
// uploadMedia keeps in the documents folder fits comfortably under this.
const MIN_FREE_BYTES = 50 * 1024 * 1024;

// Gradient across the bar row: warm → pink → violet.
function barColor(i: number): string {
  const stops: [number, number, number][] = [
    [255, 176, 58],
    [240, 68, 125],
    [140, 92, 255],
  ];
  const t = i / (BAR_COUNT - 1);
  const seg = t < 0.52 ? 0 : 1;
  const local = seg === 0 ? t / 0.52 : (t - 0.52) / 0.48;
  const [a, b] = [stops[seg], stops[seg + 1]];
  const mix = (x: number, y: number) => Math.round(x + (y - x) * local);
  return `rgb(${mix(a[0], b[0])},${mix(a[1], b[1])},${mix(a[2], b[2])})`;
}

async function deleteTake(uri: string | null) {
  if (!uri) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

async function hasEnoughFreeSpace(): Promise<boolean> {
  try {
    const free = await FileSystem.getFreeDiskStorageAsync();
    return free >= MIN_FREE_BYTES;
  } catch {
    // If the check itself isn't available, don't block recording over it.
    return true;
  }
}

function showPermissionDenied(canAskAgain: boolean) {
  const buttons: AlertButton[] = [{ text: canAskAgain ? "OK" : "Not Now", style: "cancel" }];
  if (!canAskAgain) {
    buttons.push({
      text: "Open Settings",
      onPress: () => {
        Linking.openSettings().catch(() => {});
      },
    });
  }
  Alert.alert(
    "Microphone access needed",
    canAskAgain
      ? "greenroom needs the microphone to record. Try again and tap Allow."
      : "Microphone access is turned off for greenroom. Turn it on in Settings → greenroom → Microphone.",
    buttons,
  );
}

export function VoiceRecorder({
  onFinish,
  onCancel,
  maxDurationSeconds = DEFAULT_MAX_DURATION_SECONDS,
}: {
  onFinish: (uri: string) => void;
  onCancel: () => void;
  maxDurationSeconds?: number;
}) {
  const { colors } = useTheme();
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const state = useAudioRecorderState(recorder, 80);
  const [levels, setLevels] = useState<number[]>(
    () => new Array(BAR_COUNT).fill(0.05),
  );
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const phase = useRef(0);
  // Where the take is being written. Captured right after prepare so the
  // unmount cleanup can delete it even after expo-audio releases the recorder.
  const uriRef = useRef<string | null>(null);
  // Set once we've handed off to onFinish/onCancel; every exit path checks it
  // so a take is never both saved and deleted.
  const doneRef = useRef(false);
  const sawRecordingRef = useRef(false);

  // Stop the recorder and take the audio session back out of record mode.
  // The finally guarantees the session is restored even if stop() throws.
  async function release() {
    try {
      await recorder.stop();
    } catch {
      /* already stopped or released */
    } finally {
      await exitRecordingMode();
    }
  }

  // Start recording as soon as the sheet opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (cancelled) return;
      if (!perm.granted) {
        doneRef.current = true;
        showPermissionDenied(perm.canAskAgain);
        onCancel();
        return;
      }
      if (!(await hasEnoughFreeSpace())) {
        if (cancelled) return;
        doneRef.current = true;
        Alert.alert(
          "Not enough storage",
          "Free up some space on this iPhone before recording.",
        );
        onCancel();
        return;
      }
      if (cancelled) return;
      await enterRecordingMode();
      if (cancelled) {
        // Unmounted while we were switching modes: undo it, since the
        // unmount cleanup already ran before record mode was entered.
        await exitRecordingMode();
        return;
      }
      await recorder.prepareToRecordAsync();
      const uri = recorder.uri;
      if (cancelled) {
        // Unmounted while preparing: the empty file still exists, drop it.
        await deleteTake(uri);
        await exitRecordingMode();
        return;
      }
      uriRef.current = uri;
      recorder.record({ forDuration: maxDurationSeconds });
      setStarted(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the sheet closes without Save/Cancel (backdrop tap, navigating away),
  // treat it as a cancel: stop, restore the audio session, drop the file.
  useEffect(() => {
    return () => {
      if (doneRef.current) return;
      doneRef.current = true;
      void (async () => {
        await release();
        await deleteTake(uriRef.current);
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push a new amplitude sample as metering updates. While paused the
  // waveform freezes in place; a scrolling flat line would look like a dead mic.
  useEffect(() => {
    if (!started || paused || !state.isRecording) return;
    let lvl: number;
    if (typeof state.metering === "number" && isFinite(state.metering)) {
      // metering is dBFS (-160..0): map -50..0 dB → 0..1
      lvl = Math.min(1, Math.max(0.05, (state.metering + 50) / 50));
    } else {
      // Simulated voice envelope fallback
      phase.current += 0.5;
      const swell = Math.pow((Math.sin(phase.current) + 1) / 2, 1.6);
      lvl = Math.min(1, Math.max(0.05, swell * 0.55 + Math.random() * 0.35));
    }
    setLevels((prev) => [...prev.slice(1), lvl]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.metering, state.durationMillis, started, paused, state.isRecording]);

  // The native recorder stops itself at maxDurationSeconds (or on a system
  // interruption). When we see it go from recording to stopped, keep the take.
  // A pause also reports isRecording=false, so this stays out of the way while
  // paused; resume() clears sawRecordingRef so the next "stopped" reading only
  // counts once the recorder has been seen running again.
  useEffect(() => {
    if (!started || doneRef.current || paused) return;
    if (state.isRecording) {
      sawRecordingRef.current = true;
      return;
    }
    if (sawRecordingRef.current) void stopAndSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, paused, state.isRecording]);

  function pause() {
    if (!started || paused || doneRef.current) return;
    recorder.pause();
    setPaused(true);
  }

  function resume() {
    if (!started || !paused || doneRef.current) return;
    // AVAudioRecorder's record(forDuration:) resumes a paused take into the
    // same file, so re-arm the cap with whatever time is left.
    const elapsed = (state.durationMillis ?? 0) / 1000;
    const remaining = Math.max(1, maxDurationSeconds - elapsed);
    sawRecordingRef.current = false;
    recorder.record({ forDuration: remaining });
    setPaused(false);
  }

  async function stopAndSave() {
    if (doneRef.current) return;
    doneRef.current = true;
    await release();
    const uri = uriRef.current ?? recorder.uri;
    if (uri) onFinish(uri);
    else {
      Alert.alert("Recording failed", "No file was produced.");
      onCancel();
    }
  }

  async function discard() {
    if (doneRef.current) return;
    doneRef.current = true;
    await release();
    await deleteTake(uriRef.current);
    onCancel();
  }

  function cancel() {
    if (doneRef.current) return;
    if ((state.durationMillis ?? 0) < CONFIRM_DISCARD_AFTER_MS) {
      void discard();
      return;
    }
    confirm(
      "Discard recording?",
      "This take will be deleted.",
      () => void discard(),
      "Discard",
    );
  }

  const seconds = Math.floor((state.durationMillis ?? 0) / 1000);
  const remaining = Math.max(0, maxDurationSeconds - seconds);
  const nearEnd = started && remaining <= WARN_BEFORE_END_SECONDS;
  const eyebrow = paused
    ? "PAUSED"
    : nearEnd
      ? `RECORDING · ${formatTimer(remaining)} LEFT`
      : "RECORDING";
  const eyebrowColor = paused ? colors.accent : nearEnd ? REC_RED : colors.textMuted;

  return (
    <View>
      <Text style={[styles.eyebrow, { color: eyebrowColor }]}>{eyebrow}</Text>
      <View style={styles.wave}>
        {levels.map((lvl, i) => (
          <View
            key={i}
            style={{
              width: 3,
              borderRadius: 2,
              height: `${Math.max(4, Math.round(lvl * 100))}%`,
              backgroundColor: barColor(i),
            }}
          />
        ))}
      </View>
      <Text style={[styles.timer, { color: colors.text }]}>
        {formatTimer(seconds)}
      </Text>
      <View style={styles.controls}>
        <Pressable onPress={cancel} hitSlop={12} style={styles.sideBtn}>
          <Text style={[styles.sideLabel, { color: colors.textMuted }]}>
            Cancel
          </Text>
        </Pressable>
        <PauseResumeButton paused={paused} onPress={paused ? resume : pause} />
        <Pressable
          onPress={stopAndSave}
          hitSlop={12}
          style={styles.sideBtn}
          accessibilityLabel="Done"
        >
          <Text
            style={[styles.sideLabel, { color: colors.accent, fontFamily: fonts.semibold }]}
          >
            Done
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function PauseResumeButton({
  paused,
  onPress,
}: {
  paused: boolean;
  onPress: () => void;
}) {
  const pulse = useSharedValue(0);
  const ringVisible = useSharedValue(1);
  useEffect(() => {
    if (paused) {
      // Stop the heartbeat and fade the ring out so "paused" reads at a glance.
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 200 });
      ringVisible.value = withTiming(0, { duration: 200 });
      return;
    }
    ringVisible.value = withTiming(1, { duration: 200 });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1260, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 540, easing: Easing.linear }),
      ),
      -1,
    );
  }, [pulse, ringVisible, paused]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.35 }],
    opacity: 0.45 * (1 - pulse.value) * ringVisible.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={paused ? "Resume recording" : "Pause recording"}
      accessibilityState={{ selected: paused }}
    >
      {({ pressed }) => (
        <View style={[styles.stopWrap, pressed && { transform: [{ scale: 0.94 }] }]}>
          <Animated.View style={[styles.stopRing, ring]} />
          <View style={styles.stopBg}>
            {paused ? (
              <View style={styles.resumeDot} />
            ) : (
              <View style={styles.pauseBars}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

function formatTimer(s: number) {
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    letterSpacing: 1,
    textAlign: "center",
  },
  wave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    height: 76,
    marginTop: 14,
    marginBottom: 6,
  },
  timer: {
    fontSize: 42,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
    marginTop: 22,
  },
  sideBtn: { width: 60, alignItems: "center" },
  sideLabel: { fontSize: 16, fontFamily: fonts.medium, fontWeight: "500" },
  stopWrap: { width: 74, height: 74, alignItems: "center", justifyContent: "center" },
  stopRing: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: REC_RED,
  },
  stopBg: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(255,92,122,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBars: { flexDirection: "row", gap: 7 },
  pauseBar: {
    width: 9,
    height: 30,
    borderRadius: 3,
    backgroundColor: REC_RED,
    shadowColor: REC_RED,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  resumeDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: REC_RED,
    shadowColor: REC_RED,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
