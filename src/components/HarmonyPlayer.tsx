import { useMemo } from 'react';
import { type Harmony } from '../db/database';

interface Props {
  harmony: Harmony;
  onDelete: (id: number) => void;
}

/**
 * HarmonyPlayer renders a single harmony card with:
 * - An <audio> element for playback (the browser's native controls)
 * - The measure number and caption as labels
 * - A delete button
 *
 * useMemo creates the object URL once per harmony blob, so we don't
 * regenerate it on every render. The URL stays valid as long as the
 * page is open.
 */
export default function HarmonyPlayer({ harmony, onDelete }: Props) {
  // Create a playable URL from the Blob stored in IndexedDB.
  // useMemo ensures we only call createObjectURL once per Blob instance,
  // not on every re-render.
  const audioUrl = useMemo(
    () => URL.createObjectURL(harmony.audioBlob),
    [harmony.audioBlob]
  );

  return (
    <div className="harmony-card">
      <div className="harmony-meta">
        {harmony.measureNumber && (
          <span className="harmony-measure">
            {harmony.measureNumber.includes('-')
              ? `mm. ${harmony.measureNumber}`  /* range: "mm. 16-18" */
              : `m. ${harmony.measureNumber}`    /* single: "m. 16" */
            }
          </span>
        )}
        {harmony.caption && (
          <span className="harmony-caption">{harmony.caption}</span>
        )}
      </div>

      <audio controls src={audioUrl} className="harmony-audio" />

      <button
        className="icon-btn small harmony-delete"
        onClick={() => onDelete(harmony.id!)}
        title="Delete harmony"
      >
        🗑️
      </button>
    </div>
  );
}
