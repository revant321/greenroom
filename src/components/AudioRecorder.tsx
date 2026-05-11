import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";

type Props = {
  onFinish: (uri: string) => void;
  onCancel: () => void;
};

export function AudioRecorder({ onFinish, onCancel }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRecording) return;
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 200);
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
        <Pressable style={[styles.button, styles.stop]} onPress={stop} accessibilityLabel="Stop">
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.button, styles.record]} onPress={start} accessibilityLabel="Record">
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
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 24, gap: 16 },
  timer: { fontSize: 48, fontVariant: ["tabular-nums"] },
  button: { padding: 24, borderRadius: 999, minWidth: 140, alignItems: "center" },
  record: { backgroundColor: "#FF3B30" },
  stop: { backgroundColor: "#8E8E93" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  cancel: { color: "#666", padding: 12 },
});
