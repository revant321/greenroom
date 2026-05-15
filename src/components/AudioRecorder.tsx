import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, radius, spacing, type } from "@/theme/tokens";

type Props = {
  onFinish: (uri: string) => void;
  onCancel: () => void;
};

export function AudioRecorder({ onFinish, onCancel }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRecording) return;
    const start = Date.now();
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      200,
    );
    return () => clearInterval(t);
  }, [isRecording]);

  async function start() {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Microphone permission needed",
        "Enable microphone access in iOS Settings → greenroom.",
      );
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
    setElapsed(0);
  }

  async function stop() {
    await recorder.stop();
    setIsRecording(false);
    const uri = recorder.uri;
    if (uri) onFinish(uri);
    else Alert.alert("Recording failed", "No file was produced.");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatTimer(elapsed)}</Text>
      {isRecording ? (
        <Pressable
          style={[styles.button, styles.stop]}
          onPress={stop}
          accessibilityLabel="Stop"
        >
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.button, styles.record]}
          onPress={start}
          accessibilityLabel="Record"
        >
          <Text style={styles.buttonText}>Record</Text>
        </Pressable>
      )}
      <Pressable onPress={onCancel}>
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
    </View>
  );
}

function formatTimer(s: number) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
      gap: spacing.lg,
      backgroundColor: c.bg,
    },
    timer: {
      fontSize: 48,
      fontVariant: ["tabular-nums"],
      color: c.text,
      fontWeight: "300",
    },
    button: {
      padding: spacing.xl,
      borderRadius: radius.pill,
      minWidth: 140,
      alignItems: "center",
    },
    record: { backgroundColor: c.danger },
    stop: { backgroundColor: c.textMuted },
    buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
    cancel: { color: c.textMuted, padding: spacing.md, ...type.body },
  });
}
