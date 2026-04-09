import { useState } from 'react';
import { db } from '../db/database';

interface Props {
  sceneId: number;
  onDone: () => void;
}

/**
 * SceneRecorder lets the user add either a link or an uploaded video to a scene.
 *
 * Two modes:
 * - "Link" — user pastes a URL (e.g. a Google Drive or YouTube link).
 *   Saved with type='link', url=the URL, blob=null.
 * - "Upload Video" — user picks a video file from their device.
 *   Saved with type='video', blob=the file, url=null.
 *
 * Both modes include an optional caption field.
 */
export default function SceneRecorder({ sceneId, onDone }: Props) {
  // Which input mode is active: 'link' or 'video' (null = user hasn't picked yet)
  const [mode, setMode] = useState<'link' | 'video' | null>(null);

  const [url, setUrl] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState('');

  // ---- LINK mode ----

  async function saveLink() {
    if (!url.trim()) return;
    await db.sceneRecordings.add({
      sceneId,
      type: 'link',
      blob: null,
      url: url.trim(),
      caption: caption.trim(),
      createdAt: new Date(),
    });
    onDone();
  }

  // ---- VIDEO UPLOAD mode ----

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setVideoBlob(file);
  }

  async function saveVideo() {
    if (!videoBlob) return;
    await db.sceneRecordings.add({
      sceneId,
      type: 'video',
      blob: videoBlob,
      url: null,
      caption: caption.trim(),
      createdAt: new Date(),
    });
    onDone();
  }

  // ---- RENDER ----

  return (
    <div className="scene-recorder">
      {/* Caption — shown regardless of mode */}
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="input"
      />

      {/* Mode selection: two buttons side by side */}
      {mode === null && (
        <div className="audio-input-methods">
          <button className="btn btn-secondary" onClick={() => setMode('link')}>
            Link
          </button>
          <span className="audio-input-or">or</span>
          <button className="btn btn-secondary" onClick={() => setMode('video')}>
            Upload Video
          </button>
        </div>
      )}

      {/* LINK mode — text input for URL */}
      {mode === 'link' && (
        <>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste URL (e.g. YouTube, Google Drive)"
            className="input"
            autoFocus
          />
          <div className="btn-row">
            <button className="btn btn-primary" onClick={saveLink} disabled={!url.trim()}>
              Save Link
            </button>
            <button className="btn btn-secondary" onClick={() => { setMode(null); setUrl(''); }}>
              Back
            </button>
          </div>
        </>
      )}

      {/* VIDEO UPLOAD mode — file picker + preview */}
      {mode === 'video' && (
        <>
          {videoBlob ? (
            <div className="media-preview">
              <video controls src={URL.createObjectURL(videoBlob)} className="video-preview" />
              <button className="btn-link" onClick={() => setVideoBlob(null)}>Remove & re-pick</button>
            </div>
          ) : (
            <label className="btn btn-secondary upload-label">
              Choose Video File
              <input type="file" accept="video/*" onChange={handleFileUpload} hidden />
            </label>
          )}
          <div className="btn-row">
            <button className="btn btn-primary" onClick={saveVideo} disabled={!videoBlob}>
              Save Video
            </button>
            <button className="btn btn-secondary" onClick={() => { setMode(null); setVideoBlob(null); }}>
              Back
            </button>
          </div>
        </>
      )}

      {/* Cancel always available when no mode picked */}
      {mode === null && (
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={onDone}>Cancel</button>
        </div>
      )}
    </div>
  );
}
