import { useMemo } from 'react';
import { type SceneRecording } from '../db/database';

interface Props {
  recording: SceneRecording;
  onDelete: (id: number) => void;
}

/**
 * Renders a single scene recording card.
 * Handles both audio and video — checks recording.type to decide
 * which HTML element to use for playback.
 *
 * useMemo creates the object URL once per blob so we don't re-create
 * it on every render (createObjectURL allocates memory each call).
 */
export default function SceneRecordingPlayer({ recording, onDelete }: Props) {
  const mediaUrl = useMemo(
    () => URL.createObjectURL(recording.blob),
    [recording.blob]
  );

  return (
    <div className="recording-card">
      <div className="recording-header">
        {recording.caption && (
          <span className="recording-caption">{recording.caption}</span>
        )}
        <span className="recording-type-badge">
          {recording.type === 'audio' ? '🎙' : '📹'}
        </span>
        <button
          className="icon-btn small recording-delete"
          onClick={() => onDelete(recording.id!)}
          title="Delete recording"
        >
          🗑️
        </button>
      </div>

      {recording.type === 'audio' ? (
        <audio controls src={mediaUrl} className="recording-audio" />
      ) : (
        <video controls src={mediaUrl} className="recording-video" />
      )}
    </div>
  );
}
