import { useMemo } from 'react';
import { type SceneRecording } from '../db/database';

interface Props {
  recording: SceneRecording;
  onDelete: (id: number) => void;
}

/**
 * Renders a single scene recording card.
 *
 * Two display modes based on recording.type:
 * - 'link'  → shows the URL as a clickable link (opens in new tab)
 * - 'video' → shows a <video> player with the uploaded blob
 *
 * useMemo on the blob URL prevents re-creating object URLs on every render
 * (each createObjectURL call allocates memory).
 */
export default function SceneRecordingPlayer({ recording, onDelete }: Props) {
  // Only create an object URL if there's actually a blob (video type)
  const mediaUrl = useMemo(
    () => recording.blob ? URL.createObjectURL(recording.blob) : null,
    [recording.blob]
  );

  return (
    <div className="recording-card">
      <div className="recording-header">
        {recording.caption && (
          <span className="recording-caption">{recording.caption}</span>
        )}
        <button
          className="icon-btn small recording-delete"
          onClick={() => onDelete(recording.id!)}
          title="Delete recording"
        >
          🗑️
        </button>
      </div>

      {recording.type === 'link' && recording.url ? (
        // Clickable link — opens in a new tab
        <a
          href={recording.url}
          target="_blank"
          rel="noopener noreferrer"
          className="scene-recording-link"
        >
          {recording.url}
        </a>
      ) : mediaUrl ? (
        // Uploaded video — native player
        <video controls src={mediaUrl} className="recording-video" />
      ) : null}
    </div>
  );
}
