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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import { fonts, fontScale, press, radius, spacing, type } from "@/theme/tokens";
import { enterRecordingMode, exitRecordingMode } from "@/lib/audioSession";
import { confirm } from "@/utils/confirm";
import { haptics } from "@/utils/haptics";

/**
 * Voice Memos–style recorder (prototype port).
 * - Live amplitude waveform: bar height = input loudness, newest sample
 *   scrolls in from the right (falls back to a simulated envelope when
 *   metering is unavailable).
 * - Large thin timer, pulsing red stop square, Cancel / Save.
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
const STOP_SIZE = 74;

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
      haptics.tap();
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

  // Push a new amplitude sample as metering updates.
  useEffect(() => {
    if (!started || !state.isRecording) return;
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
  }, [state.metering, state.durationMillis, started, state.isRecording]);

  // The native recorder stops itself at maxDurationSeconds (or on a system
  // interruption). When we see it go from recording to stopped, keep the take.
  useEffect(() => {
    if (!started || doneRef.current) return;
    if (state.isRecording) {
      sawRecordingRef.current = true;
      return;
    }
    if (sawRecordingRef.current) void stopAndSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, state.isRecording]);

  async function stopAndSave() {
    if (doneRef.current) return;
    doneRef.current = true;
    await release();
    const uri = uriRef.current ?? recorder.uri;
    if (uri) {
      haptics.tap();
      onFinish(uri);
    } else {
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

  return (
    <View>
      <Text
        style={[styles.eyebrow, { color: nearEnd ? REC_RED : colors.textMuted }]}
        maxFontSizeMultiplier={fontScale.compact}
      >
        {nearEnd ? `RECORDING · ${formatTimer(remaining)} LEFT` : "RECORDING"}
      </Text>
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
      <Text
        style={[styles.timer, { color: colors.text }]}
        maxFontSizeMultiplier={fontScale.display}
      >
        {formatTimer(seconds)}
      </Text>
      <View style={styles.controls}>
        <Pressable
          onPress={cancel}
          hitSlop={12}
          accessibilityRole="button"
          style={({ pressed }) => [styles.sideBtn, pressed && press.dim]}
        >
          <Text style={[styles.sideLabel, { color: colors.textMuted }]}>
            Cancel
          </Text>
        </Pressable>
        <PulsingStop onPress={stopAndSave} />
        <Pressable
          onPress={stopAndSave}
          hitSlop={12}
          accessibilityRole="button"
          style={({ pressed }) => [styles.sideBtn, pressed && press.dim]}
        >
          <Text
            style={[styles.sideLabel, { color: colors.accent, fontFamily: fonts.semibold }]}
          >
            Save
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function PulsingStop({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1260, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 540, easing: Easing.linear }),
      ),
      -1,
    );
  }, [pulse]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.35 }],
    opacity: 0.45 * (1 - pulse.value),
  }));

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Stop and save">
      {({ pressed }) => (
        <View style={[styles.stopWrap, pressed && { transform: [{ scale: 0.94 }] }]}>
          <Animated.View style={[styles.stopRing, ring]} />
          <View style={styles.stopBg}>
            <View style={styles.stopSquare} />
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
  eyebrow: { ...type.eyebrow, letterSpacing: 1, textAlign: "center" },
  wave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
    height: 76,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
    gap: spacing.xxl,
    marginTop: spacing.xl,
  },
  sideBtn: { width: 60, alignItems: "center" },
  sideLabel: { ...type.body, fontFamily: fonts.medium, fontWeight: "500" },
  stopWrap: { width: STOP_SIZE, height: STOP_SIZE, alignItems: "center", justifyContent: "center" },
  stopRing: {
    position: "absolute",
    width: STOP_SIZE,
    height: STOP_SIZE,
    borderRadius: STOP_SIZE / 2,
    backgroundColor: REC_RED,
  },
  stopBg: {
    width: STOP_SIZE,
    height: STOP_SIZE,
    borderRadius: STOP_SIZE / 2,
    backgroundColor: "rgba(255,92,122,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopSquare: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: REC_RED,
    shadowColor: REC_RED,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
