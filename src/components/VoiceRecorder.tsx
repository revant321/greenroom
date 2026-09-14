import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
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

/**
 * Voice Memos–style recorder (prototype port).
 * - Live amplitude waveform: bar height = input loudness, newest sample
 *   scrolls in from the right (falls back to a simulated envelope when
 *   metering is unavailable).
 * - Large thin timer, pulsing red pause/resume button, Cancel / Done.
 * - Pause and resume continue into the same file: the native recorder
 *   (AVAudioRecorder) handles it and expo-audio reports the accumulated
 *   duration, so the timer never counts wall-clock time while paused.
 * - Same props as the old AudioRecorder, so callers are unchanged.
 *   Present inside <Sheet> (see screens) rather than a full-screen modal.
 */
const BAR_COUNT = 44;
const REC_RED = "#FF5C7A";

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

export function VoiceRecorder({
  onFinish,
  onCancel,
}: {
  onFinish: (uri: string) => void;
  onCancel: () => void;
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

  // Start recording as soon as the sheet opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Microphone permission needed",
          "Enable microphone access in iOS Settings → greenroom.",
        );
        onCancel();
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (cancelled) return;
      recorder.record();
      setStarted(true);
    })();
    return () => {
      cancelled = true;
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

  function togglePause() {
    if (!started) return;
    if (paused) {
      recorder.record();
      setPaused(false);
    } else {
      recorder.pause();
      setPaused(true);
    }
  }

  async function stopAndSave() {
    try {
      await recorder.stop();
    } catch {
      /* already stopped */
    }
    const uri = recorder.uri;
    if (uri) onFinish(uri);
    else {
      Alert.alert("Recording failed", "No file was produced.");
      onCancel();
    }
  }

  async function cancel() {
    try {
      await recorder.stop();
    } catch {
      /* noop */
    }
    onCancel();
  }

  const seconds = Math.floor((state.durationMillis ?? 0) / 1000);

  return (
    <View>
      <Text
        style={[styles.eyebrow, { color: paused ? colors.accent : colors.textMuted }]}
      >
        {paused ? "PAUSED" : "RECORDING"}
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
      <Text style={[styles.timer, { color: colors.text }]}>
        {formatTimer(seconds)}
      </Text>
      <View style={styles.controls}>
        <Pressable onPress={cancel} hitSlop={12} style={styles.sideBtn}>
          <Text style={[styles.sideLabel, { color: colors.textMuted }]}>
            Cancel
          </Text>
        </Pressable>
        <PauseResumeButton paused={paused} onPress={togglePause} />
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
