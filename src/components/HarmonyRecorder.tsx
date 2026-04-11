import { useState, useRef } from 'react';
import { db } from '../db/database';
import AudioWaveform from './AudioWaveform';
import { useWakeLock } from '../hooks/useWakeLock';

interface Props {
  musicalNumberId: number;
  onDone: () => void;   // called after saving or cancelling, so parent can hide the form
}

/**
 * HarmonyRecorder provides two ways to add a harmony:
 *
 * 1. **Record** — uses navigator.mediaDevices.getUserMedia() to access the
 *    microphone, then MediaRecorder to capture audio chunks. While recording,
 *    a real-time waveform visualizer shows the audio amplitude via the
 *    Web Audio API AnalyserNode.
 *
 * 2. **Upload** — a file input that accepts audio files.
 *
 * Measure numbers use a start/end system: if the harmony covers measures 16–18,
 * startMeasure=16 and endMeasure=18. For a single measure, both are the same.
 */
export default function HarmonyRecorder({ musicalNumberId, onDone }: Props) {
  // Form fields — start/end measure numbers instead of a freeform string
  const [startMeasure, setStartMeasure] = useState('');
  const [endMeasure, setEndMeasure] = useState('');
  const [measureError, setMeasureError] = useState('');
  const [caption, setCaption] = useState('');

  // Audio state — the Blob that will be saved to IndexedDB
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');

  // We keep a ref to the live MediaStream so the AudioWaveform component
  // can tap into it for real-time visualization
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);

  // Refs for MediaRecorder plumbing (don't trigger re-renders)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Wake lock — keeps the screen on during recording
  const { requestWakeLock, releaseWakeLock } = useWakeLock();

  // ---- RECORD via microphone ----

  async function startRecording() {
    setRecordingError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Store the stream in state so AudioWaveform can read from it.
      // This is different from a ref — we need React to re-render so the
      // AudioWaveform component receives the new stream prop.
      setLiveStream(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        setLiveStream(null); // Clear stream so waveform stops
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      await requestWakeLock(); // Keep screen on during recording
    } catch {
      setRecordingError('Could not access microphone. Check permissions.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    releaseWakeLock(); // Allow screen to lock again
  }

  // ---- UPLOAD a file ----

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
    }
  }

  // ---- VALIDATE measure numbers ----

  function validateMeasures(): boolean {
    const start = startMeasure.trim();
    const end = endMeasure.trim();

    // Both empty is valid (measure numbers are optional)
    if (!start && !end) {
      setMeasureError('');
      return true;
    }

    // If one is filled, both must be filled
    if (!start || !end) {
      setMeasureError('Enter both start and end measure, or leave both empty.');
      return false;
    }

    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);

    if (isNaN(startNum) || startNum < 1) {
      setMeasureError('Start measure must be a positive number.');
      return false;
    }
    if (isNaN(endNum) || endNum < 1) {
      setMeasureError('End measure must be a positive number.');
      return false;
    }
    if (endNum < startNum) {
      setMeasureError('End measure cannot be before start measure.');
      return false;
    }

    setMeasureError('');
    return true;
  }

  // ---- SAVE to IndexedDB ----

  async function save() {
    if (!audioBlob) return;
    if (!validateMeasures()) return;

    const start = startMeasure.trim();
    const end = endMeasure.trim();

    await db.harmonies.add({
      musicalNumberId,
      audioBlob,
      // Store as "start-end" string (e.g. "16-18") or empty string.
      // If start equals end, store just the single number (e.g. "16").
      measureNumber: start
        ? (start === end ? start : `${start}-${end}`)
        : '',
      caption: caption.trim(),
      createdAt: new Date(),
    });

    onDone();
  }

  // ---- CLEAR recorded/uploaded audio to re-record ----

  function clearAudio() {
    setAudioBlob(null);
    chunksRef.current = [];
  }

  return (
    <div className="harmony-recorder">
      {/* Measure number inputs — two number fields for start and end */}
      <div className="measure-row">
        <input
          type="number"
          inputMode="numeric"
          value={startMeasure}
          onChange={(e) => { setStartMeasure(e.target.value); setMeasureError(''); }}
          placeholder="Start m."
          className="measure-input"
          min={1}
        />
        <span className="measure-dash">–</span>
        <input
          type="number"
          inputMode="numeric"
          value={endMeasure}
          onChange={(e) => { setEndMeasure(e.target.value); setMeasureError(''); }}
          placeholder="End m."
          className="measure-input"
          min={1}
        />
      </div>
      {measureError && <p className="measure-error">{measureError}</p>}

      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (e.g. 'Alto harmony for bridge')"
        className="input"
      />

      {/* Audio input — show either the record/upload controls or a preview */}
      {audioBlob ? (
        <div className="audio-preview">
          <audio controls src={URL.createObjectURL(audioBlob)} />
          <button className="btn-link" onClick={clearAudio}>Remove & re-record</button>
        </div>
      ) : (
        <div className="audio-input-methods">
          {isRecording ? (
            <button className="btn btn-danger" onClick={stopRecording}>
              ⏹ Stop Recording
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={startRecording}>
              🎙 Record
            </button>
          )}

          <span className="audio-input-or">or</span>

          <label className="btn btn-secondary upload-label">
            📁 Upload File
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              hidden
            />
          </label>
        </div>
      )}

      {/* Real-time waveform visualizer — only visible while recording */}
      {isRecording && (
        <AudioWaveform stream={liveStream} isRecording={isRecording} />
      )}

      {recordingError && <p className="error-text">{recordingError}</p>}

      {/* Save / Cancel buttons */}
      <div className="btn-row">
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={!audioBlob}
        >
          Save Harmony
        </button>
        <button className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
