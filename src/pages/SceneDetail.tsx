import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import SceneRecorder from '../components/SceneRecorder';
import SceneRecordingPlayer from '../components/SceneRecordingPlayer';

export default function SceneDetail() {
  const { showId, sceneId } = useParams<{ showId: string; sceneId: string }>();
  const navigate = useNavigate();
  const scId = Number(sceneId);

  // Live-subscribe to this scene's data
  const scene = useLiveQuery(() => db.scenes.get(scId), [scId]);

  // ---- Smart-save notes (same pattern as MusicalNumberDetail) ----
  // Notes are kept in local state and only written to IndexedDB on blur
  // or explicit save. This avoids a DB write on every keystroke.
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  // Sync local notes state when the scene loads or changes externally
  useEffect(() => {
    if (scene) {
      setNotes(scene.notes);
      setNotesDirty(false);
    }
  }, [scene]);

  async function saveNotes() {
    if (!notesDirty) return;
    await db.scenes.update(scId, { notes });
    setNotesDirty(false);
  }

  if (scene === undefined) return <div className="page"><p>Loading...</p></div>;
  if (scene === null) return <div className="page"><p>Scene not found.</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(`/show/${showId}/scenes`)}>
          ← Scenes
        </button>
      </header>

      {/* Scene title with order badge */}
      <div className="detail-title-section">
        <span className="detail-order">#{scene.order}</span>
        <h1 className="detail-name">{scene.name}</h1>
      </div>

      {/* Notes section */}
      <section className="detail-section">
        <h3 className="detail-section-title">Notes</h3>
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          onBlur={saveNotes}
          placeholder="Add blocking notes, cues, reminders..."
          rows={6}
        />
        {notesDirty && (
          <button className="btn btn-primary save-notes-btn" onClick={saveNotes}>
            Save Notes
          </button>
        )}
      </section>

      {/* Recordings section */}
      <RecordingsSection sceneId={scId} />
    </div>
  );
}

/**
 * RecordingsSection manages the full recordings UI for a scene:
 * - Lists all saved recordings (audio + video) via useLiveQuery
 * - Each recording renders as a SceneRecordingPlayer with playback + delete
 * - A toggle button shows/hides the SceneRecorder form for adding new ones
 *
 * Defined in this file (not in components/) because it's specific to
 * SceneDetail and not reused elsewhere — same reasoning as HarmoniesSection
 * in MusicalNumberDetail.
 */
function RecordingsSection({ sceneId }: { sceneId: number }) {
  const [showRecorder, setShowRecorder] = useState(false);

  // Live query — re-renders automatically when recordings are added/deleted
  const recordings = useLiveQuery(
    () => db.sceneRecordings.where('sceneId').equals(sceneId).toArray(),
    [sceneId]
  );

  async function deleteRecording(id: number) {
    await db.sceneRecordings.delete(id);
  }

  return (
    <section className="detail-section">
      <h3 className="detail-section-title">Recordings</h3>

      {/* List of saved recordings */}
      {recordings && recordings.length > 0 ? (
        <div className="recording-list">
          {recordings.map((rec) => (
            <SceneRecordingPlayer
              key={rec.id}
              recording={rec}
              onDelete={deleteRecording}
            />
          ))}
        </div>
      ) : (
        !showRecorder && (
          <p className="empty-state empty-state-small">
            No recordings yet. Record or upload your first one!
          </p>
        )
      )}

      {/* Add recording form (toggled) */}
      {showRecorder ? (
        <SceneRecorder
          sceneId={sceneId}
          onDone={() => setShowRecorder(false)}
        />
      ) : (
        <button
          className="btn btn-primary add-show-btn"
          onClick={() => setShowRecorder(true)}
        >
          + Add Recording
        </button>
      )}
    </section>
  );
}
