import { useState, useRef } from 'react';
import { db } from '../db/database';
import AudioWaveform from './AudioWaveform';

interface Props {
  sceneId: number;
  onDone: () => void;  // called after saving or cancelling
}

/**
 * SceneRecorder lets the user add a recording to a scene.
 *
 * Supports audio or video, via recording or file upload. When recording
 * audio, a real-time waveform visualizer (AudioWaveform) shows the mic
 * input amplitude on a canvas.
 *
 * The flow:
 * 1. User picks audio or video via toggle buttons
 * 2. User either records (mic or camera) or uploads a file
 * 3. User adds an optional caption
 * 4. Save → writes to IndexedDB → onDone() hides the form
 */
export default function SceneRecorder({ sceneId, onDone }: Props) {
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');

  // Live stream stored in state (not just ref) so AudioWaveform re-renders
  // when it becomes available
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ---- RECORD via mic or camera ----

  async function startRecording() {
    setRecordingError('');
    try {
      const constraints = mediaType === 'audio'
        ? { audio: true }
        : { audio: true, video: { facingMode: 'environment' } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLiveStream(stream);

      const mimeType = mediaType === 'audio'
        ? (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '')
        : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setMediaBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        setLiveStream(null);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      const device = mediaType === 'audio' ? 'microphone' : 'camera';
      setRecordingError(`Could not access ${device}. Check permissions.`);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  // ---- UPLOAD a file ----

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setMediaBlob(file);
  }

  // ---- SAVE to IndexedDB ----

  async function save() {
    if (!mediaBlob) return;

    await db.sceneRecordings.add({
      sceneId,
      type: mediaType,
      blob: mediaBlob,
      caption: caption.trim(),
      createdAt: new Date(),
    });

    onDone();
  }

  // ---- CLEAR to re-record ----

  function clearMedia() {
    setMediaBlob(null);
    chunksRef.current = [];
    if (liveStream) {
      liveStream.getTracks().forEach((t) => t.stop());
      setLiveStream(null);
    }
  }

  const fileAccept = mediaType === 'audio' ? 'audio/*' : 'video/*';

  return (
    <div className="scene-recorder">
      {/* Step 1: Pick audio or video */}
      <div className="media-type-toggle">
        <button
          className={`btn ${mediaType === 'audio' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setMediaType('audio'); clearMedia(); }}
        >
          Audio
        </button>
        <button
          className={`btn ${mediaType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setMediaType('video'); clearMedia(); }}
        >
          Video
        </button>
      </div>

      {/* Optional caption */}
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="input"
      />

      {/* Step 2: Record or upload */}
      {mediaBlob ? (
        <div className="media-preview">
          {mediaType === 'audio' ? (
            <audio controls src={URL.createObjectURL(mediaBlob)} />
          ) : (
            <video controls src={URL.createObjectURL(mediaBlob)} className="video-preview" />
          )}
          <button className="btn-link" onClick={clearMedia}>Remove & re-record</button>
        </div>
      ) : (
        <div className="audio-input-methods">
          {isRecording ? (
            <button className="btn btn-danger" onClick={stopRecording}>
              ⏹ Stop Recording
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={startRecording}>
              {mediaType === 'audio' ? '🎙 Record' : '📹 Record'}
            </button>
          )}

          <span className="audio-input-or">or</span>

          <label className="btn btn-secondary upload-label">
            📁 Upload File
            <input
              type="file"
              accept={fileAccept}
              onChange={handleFileUpload}
              hidden
            />
          </label>
        </div>
      )}

      {/* Real-time waveform — shown during audio recording only.
          For video recording, the waveform would be less useful since
          the user is focused on the camera feed, but we show it for
          audio recordings where the visual feedback is valuable. */}
      {isRecording && mediaType === 'audio' && (
        <AudioWaveform stream={liveStream} isRecording={isRecording} />
      )}

      {recordingError && <p className="error-text">{recordingError}</p>}

      {/* Save / Cancel */}
      <div className="btn-row">
        <button className="btn btn-primary" onClick={save} disabled={!mediaBlob}>
          Save Recording
        </button>
        <button className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
