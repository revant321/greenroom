import { useState, useRef } from 'react';
import { db } from '../db/database';
import { useWakeLock } from '../hooks/useWakeLock';

interface Props {
  musicalNumberId: number;
  onDone: () => void;
}

/**
 * DanceVideoRecorder lets the user add a dance video in two ways:
 *
 * 1. **Link** — paste a URL (YouTube, Google Drive, etc.)
 * 2. **File** — upload or record a video directly
 *
 * The user picks the type first, fills in a title, then provides the content.
 */
export default function DanceVideoRecorder({ musicalNumberId, onDone }: Props) {
  const [inputType, setInputType] = useState<'link' | 'file'>('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { requestWakeLock, releaseWakeLock } = useWakeLock();

  async function startRecording() {
    setRecordingError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'environment' },
      });

      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setVideoBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      await requestWakeLock();
    } catch {
      setRecordingError('Could not access camera. Check permissions.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    releaseWakeLock();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setVideoBlob(file);
  }

  function clearVideo() {
    setVideoBlob(null);
    chunksRef.current = [];
  }

  async function save() {
    if (inputType === 'link') {
      if (!url.trim()) return;
      await db.danceVideos.add({
        musicalNumberId,
        type: 'link',
        url: url.trim(),
        videoBlob: null,
        title: title.trim() || url.trim(),
        createdAt: new Date(),
      });
    } else {
      if (!videoBlob) return;
      await db.danceVideos.add({
        musicalNumberId,
        type: 'file',
        url: null,
        videoBlob,
        title: title.trim() || 'Untitled Video',
        createdAt: new Date(),
      });
    }
    onDone();
  }

  const canSave = inputType === 'link' ? url.trim().length > 0 : videoBlob !== null;

  return (
    <div className="dance-video-form">
      {/* Toggle between link and file */}
      <div className="media-type-toggle">
        <button
          className={`btn ${inputType === 'link' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setInputType('link'); clearVideo(); }}
        >
          Link
        </button>
        <button
          className={`btn ${inputType === 'file' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setInputType('file'); setUrl(''); }}
        >
          Video File
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. 'Act 2 Choreography')"
        className="input"
      />

      {inputType === 'link' ? (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/..."
          className="input"
        />
      ) : videoBlob ? (
        <div className="media-preview">
          <video controls src={URL.createObjectURL(videoBlob)} className="video-preview" />
          <button className="btn-link" onClick={clearVideo}>Remove & re-record</button>
        </div>
      ) : (
        <div className="audio-input-methods">
          {isRecording ? (
            <button className="btn btn-danger" onClick={stopRecording}>
              ⏹ Stop Recording
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={startRecording}>
              📹 Record
            </button>
          )}
          <span className="audio-input-or">or</span>
          <label className="btn btn-secondary upload-label">
            📁 Upload File
            <input type="file" accept="video/*" onChange={handleFileUpload} hidden />
          </label>
        </div>
      )}

      {recordingError && <p className="error-text">{recordingError}</p>}

      <div className="btn-row">
        <button className="btn btn-primary" onClick={save} disabled={!canSave}>
          Save Video
        </button>
        <button className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
