import { useMemo } from 'react';
import { type DanceVideo } from '../db/database';

interface Props {
  video: DanceVideo;
  onDelete: (id: number) => void;
}

/**
 * Renders a single dance video card. Two modes:
 * - type="link": shows the title as a clickable external link
 * - type="file": shows a <video> player with the stored Blob
 */
export default function DanceVideoPlayer({ video, onDelete }: Props) {
  // Only create an object URL for file-type videos (not links)
  const videoUrl = useMemo(
    () => video.videoBlob ? URL.createObjectURL(video.videoBlob) : null,
    [video.videoBlob]
  );

  return (
    <div className="dance-video-card">
      <span className="dance-video-title">{video.title || 'Untitled'}</span>

      {video.type === 'link' ? (
        <a
          href={video.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="dance-video-link"
        >
          {video.url}
        </a>
      ) : (
        <video controls src={videoUrl!} className="recording-video" />
      )}

      <button
        className="icon-btn small dance-video-delete"
        onClick={() => onDelete(video.id!)}
        title="Delete video"
      >
        🗑️
      </button>
    </div>
  );
}
