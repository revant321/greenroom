import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Harmony, type DanceVideo, type SheetMusic, type SceneRecording, type QuickChange } from '../db/database';
import { exportShowAsGrm } from '../utils/showExportImport';

/**
 * CompletedShowDetail is a **read-only** view of a completed show.
 *
 * It displays the show's full structure:
 * - Musical numbers (in order) — each expandable to show kept media
 *   (harmonies, dance videos, sheet music)
 * - Scenes (in order) — with badges for "in scene" status, expandable
 *   to show kept recordings
 *
 * No editing, no adding, no deleting individual items.
 * There's a single "Delete Remaining Data" button at the bottom that
 * removes ALL remaining media (but keeps the show structure visible
 * in the completed list).
 */
export default function CompletedShowDetail() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const id = Number(showId);

  const show = useLiveQuery(() => db.shows.get(id), [id]);
  const numbers = useLiveQuery(
    () => db.musicalNumbers.where('showId').equals(id).sortBy('order'),
    [id]
  );
  const scenes = useLiveQuery(
    () => db.scenes.where('showId').equals(id).sortBy('order'),
    [id]
  );
  const quickChanges = useLiveQuery(
    () => db.quickChanges.where('showId').equals(id).toArray(),
    [id]
  );

  // Fetch all media for all musical numbers in this show.
  // We load everything upfront so we can show counts on each number card.
  const allHarmonies = useLiveQuery(async () => {
    if (!numbers) return [];
    const ids = numbers.map((n) => n.id!);
    if (ids.length === 0) return [];
    return db.harmonies.where('musicalNumberId').anyOf(ids).toArray();
  }, [numbers]);

  const allDanceVideos = useLiveQuery(async () => {
    if (!numbers) return [];
    const ids = numbers.map((n) => n.id!);
    if (ids.length === 0) return [];
    return db.danceVideos.where('musicalNumberId').anyOf(ids).toArray();
  }, [numbers]);

  const allSheetMusic = useLiveQuery(async () => {
    if (!numbers) return [];
    const ids = numbers.map((n) => n.id!);
    if (ids.length === 0) return [];
    return db.sheetMusic.where('musicalNumberId').anyOf(ids).toArray();
  }, [numbers]);

  const allSceneRecordings = useLiveQuery(async () => {
    if (!scenes) return [];
    const ids = scenes.map((s) => s.id!);
    if (ids.length === 0) return [];
    return db.sceneRecordings.where('sceneId').anyOf(ids).toArray();
  }, [scenes]);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Confirmation state for deleting remaining data
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check if there's any remaining media to delete
  const hasRemainingMedia = (
    (allHarmonies && allHarmonies.length > 0) ||
    (allDanceVideos && allDanceVideos.length > 0) ||
    (allSheetMusic && allSheetMusic.length > 0) ||
    (allSceneRecordings && allSceneRecordings.length > 0)
  );

  async function deleteRemainingData() {
    await db.transaction('rw', [db.harmonies, db.danceVideos, db.sheetMusic, db.sceneRecordings], async () => {
      if (!numbers || !scenes) return;
      const numberIds = numbers.map((n) => n.id!);
      const sceneIds = scenes.map((s) => s.id!);

      if (numberIds.length > 0) {
        await db.harmonies.where('musicalNumberId').anyOf(numberIds).delete();
        await db.danceVideos.where('musicalNumberId').anyOf(numberIds).delete();
        await db.sheetMusic.where('musicalNumberId').anyOf(numberIds).delete();
      }
      if (sceneIds.length > 0) {
        await db.sceneRecordings.where('sceneId').anyOf(sceneIds).delete();
      }
    });
    setShowDeleteConfirm(false);
  }

  function formatDate(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  }

  if (show === undefined) return <div className="page"><p>Loading...</p></div>;
  if (show === null) return <div className="page"><p>Show not found.</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/completed')}>
          ← Completed
        </button>
      </header>

      {/* Show header — name, roles, completion date */}
      <div className="completed-detail-header">
        <h1 className="completed-detail-name">{show.name}</h1>
        {show.roles.length > 0 && (
          <p className="completed-detail-roles">{show.roles.join(', ')}</p>
        )}
        <p className="completed-detail-date">
          Completed {formatDate(show.completedAt)}
        </p>
      </div>

      {/* Export completed show */}
      <button
        className="btn btn-secondary complete-btn"
        style={{ marginBottom: 20 }}
        disabled={exporting}
        onClick={async () => {
          setExporting(true);
          try {
            await exportShowAsGrm(id, show.name);
          } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. Please try again.');
          }
          setExporting(false);
        }}
      >
        {exporting ? 'Exporting...' : 'Export Show'}
      </button>

      {/* Musical Numbers Section */}
      <section className="detail-section">
        <h3 className="detail-section-title">Musical Numbers</h3>
        {numbers && numbers.length > 0 ? (
          <div className="completed-items-list">
            {numbers.map((num) => (
              <CompletedNumberCard
                key={num.id}
                name={num.name}
                order={num.order}
                harmonies={(allHarmonies || []).filter((h) => h.musicalNumberId === num.id)}
                danceVideos={(allDanceVideos || []).filter((v) => v.musicalNumberId === num.id)}
                sheetMusic={(allSheetMusic || []).filter((s) => s.musicalNumberId === num.id)}
              />
            ))}
          </div>
        ) : (
          <p className="empty-state empty-state-small">No musical numbers.</p>
        )}
      </section>

      {/* Scenes Section (with quick changes interleaved) */}
      <section className="detail-section">
        <h3 className="detail-section-title">Scenes</h3>
        {scenes && scenes.length > 0 ? (
          <div className="completed-items-list">
            {/* Quick changes before first scene */}
            {(quickChanges || []).filter(qc => qc.afterSceneOrder === 0).map(qc => (
              <CompletedQuickChangeCard key={`qc-${qc.id}`} qc={qc} />
            ))}
            {scenes.map((scene) => (
              <div key={scene.id}>
                <CompletedSceneCard
                  name={scene.name}
                  order={scene.order}
                  isUserInScene={scene.isUserInScene}
                  recordings={(allSceneRecordings || []).filter((r) => r.sceneId === scene.id)}
                />
                {/* Quick changes after this scene */}
                {(quickChanges || []).filter(qc => qc.afterSceneOrder === scene.order).map(qc => (
                  <CompletedQuickChangeCard key={`qc-${qc.id}`} qc={qc} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state empty-state-small">No scenes.</p>
        )}
      </section>

      {/* Delete remaining data — only shown if there's media left */}
      {hasRemainingMedia && (
        <div className="completed-delete-section">
          {showDeleteConfirm ? (
            <div className="complete-confirm">
              <p>Delete all remaining media for "<strong>{show.name}</strong>"?</p>
              <p className="complete-hint">
                This removes all kept audio, videos, links, and sheet music.
                The show will still appear in your completed list.
              </p>
              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 12 }}>
                <button className="btn btn-danger" onClick={deleteRemainingData}>
                  Delete All Media
                </button>
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-secondary complete-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Remaining Data
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Completed Number Card ----------

/**
 * An expandable card for a musical number in the read-only view.
 * Shows the number name and order, plus counts of kept media.
 * Tapping expands to reveal the actual media players (harmonies,
 * dance videos, sheet music).
 */
function CompletedNumberCard({
  name,
  order,
  harmonies,
  danceVideos,
  sheetMusic,
}: {
  name: string;
  order: number;
  harmonies: Harmony[];
  danceVideos: DanceVideo[];
  sheetMusic: SheetMusic[];
}) {
  const [expanded, setExpanded] = useState(false);
  const totalMedia = harmonies.length + danceVideos.length + sheetMusic.length;

  return (
    <div className="completed-item-card">
      <div
        className="completed-item-header"
        onClick={() => totalMedia > 0 && setExpanded(!expanded)}
        style={{ cursor: totalMedia > 0 ? 'pointer' : 'default' }}
      >
        <div className="completed-item-info">
          <span className="number-order">#{order}</span>
          <span className="completed-item-name">{name}</span>
        </div>
        {totalMedia > 0 && (
          <span className={`completed-item-chevron ${expanded ? 'chevron-open' : ''}`}>
            ›
          </span>
        )}
      </div>

      {/* Media counts — always visible as subtle badges */}
      {totalMedia > 0 && (
        <div className="completed-media-badges">
          {harmonies.length > 0 && (
            <span className="completed-media-badge">
              🎙 {harmonies.length}
            </span>
          )}
          {danceVideos.length > 0 && (
            <span className="completed-media-badge">
              🎬 {danceVideos.length}
            </span>
          )}
          {sheetMusic.length > 0 && (
            <span className="completed-media-badge">
              📄 {sheetMusic.length}
            </span>
          )}
        </div>
      )}

      {/* Expanded content — actual media players */}
      <div className={`completed-item-content ${expanded ? 'content-expanded' : ''}`}>
        {expanded && (
          <div className="completed-media-section">
            {harmonies.length > 0 && (
              <div className="completed-media-group">
                <span className="completed-media-label">Harmonies</span>
                {harmonies.map((h) => (
                  <ReadOnlyHarmony key={h.id} harmony={h} />
                ))}
              </div>
            )}
            {danceVideos.length > 0 && (
              <div className="completed-media-group">
                <span className="completed-media-label">Dance Videos</span>
                {danceVideos.map((v) => (
                  <ReadOnlyDanceVideo key={v.id} video={v} />
                ))}
              </div>
            )}
            {sheetMusic.length > 0 && (
              <div className="completed-media-group">
                <span className="completed-media-label">Sheet Music</span>
                {sheetMusic.map((s) => (
                  <ReadOnlySheetMusic key={s.id} sheet={s} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Completed Scene Card ----------

/**
 * An expandable card for a scene in the read-only view.
 * Shows the scene name, order, and whether the user was in it.
 * If there are kept recordings, tapping expands to show them.
 */
function CompletedSceneCard({
  name,
  order,
  isUserInScene,
  recordings,
}: {
  name: string;
  order: number;
  isUserInScene: boolean;
  recordings: SceneRecording[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`completed-item-card ${!isUserInScene ? 'completed-item-inactive' : ''}`}>
      <div
        className="completed-item-header"
        onClick={() => recordings.length > 0 && setExpanded(!expanded)}
        style={{ cursor: recordings.length > 0 ? 'pointer' : 'default' }}
      >
        <div className="completed-item-info">
          <span className="scene-order">#{order}</span>
          <span className="completed-item-name">{name}</span>
          {isUserInScene && (
            <span className="completed-in-scene-badge">In Scene</span>
          )}
        </div>
        {recordings.length > 0 && (
          <span className={`completed-item-chevron ${expanded ? 'chevron-open' : ''}`}>
            ›
          </span>
        )}
      </div>

      {recordings.length > 0 && (
        <div className="completed-media-badges">
          <span className="completed-media-badge">
            {recordings.filter((r) => r.type === 'link').length > 0 &&
              `🔗 ${recordings.filter((r) => r.type === 'link').length}`}
          </span>
          <span className="completed-media-badge">
            {recordings.filter((r) => r.type === 'video').length > 0 &&
              `📹 ${recordings.filter((r) => r.type === 'video').length}`}
          </span>
        </div>
      )}

      <div className={`completed-item-content ${expanded ? 'content-expanded' : ''}`}>
        {expanded && (
          <div className="completed-media-section">
            {recordings.map((rec) => (
              <ReadOnlyRecording key={rec.id} recording={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Read-Only Media Components ----------

/**
 * These are simplified versions of the full player components.
 * They show the media with playback but NO delete buttons —
 * the only way to remove media is the "Delete Remaining Data" button.
 */

function ReadOnlyHarmony({ harmony }: { harmony: Harmony }) {
  const audioUrl = useMemo(
    () => URL.createObjectURL(harmony.audioBlob),
    [harmony.audioBlob]
  );

  return (
    <div className="completed-media-card">
      <div className="harmony-meta">
        {harmony.measureNumber && (
          <span className="harmony-measure">
            {harmony.measureNumber.includes('-')
              ? `mm. ${harmony.measureNumber}`
              : `m. ${harmony.measureNumber}`}
          </span>
        )}
        {harmony.caption && (
          <span className="harmony-caption">{harmony.caption}</span>
        )}
      </div>
      <audio controls src={audioUrl} className="harmony-audio" />
    </div>
  );
}

function ReadOnlyDanceVideo({ video }: { video: DanceVideo }) {
  const videoUrl = useMemo(
    () => video.videoBlob ? URL.createObjectURL(video.videoBlob) : null,
    [video.videoBlob]
  );

  return (
    <div className="completed-media-card">
      <span className="dance-video-title">{video.title || 'Untitled'}</span>
      {video.type === 'link' ? (
        <a href={video.url!} target="_blank" rel="noopener noreferrer" className="dance-video-link">
          {video.url}
        </a>
      ) : (
        <video controls src={videoUrl!} className="recording-video" />
      )}
    </div>
  );
}

function ReadOnlySheetMusic({ sheet }: { sheet: SheetMusic }) {
  function openPdf() {
    const url = URL.createObjectURL(sheet.pdfBlob);
    window.open(url, '_blank');
  }

  return (
    <div className="sheet-music-card" onClick={openPdf}>
      <span className="sheet-music-title">
        <span className="sheet-music-badge">📄</span>
        {sheet.title}
      </span>
    </div>
  );
}

function ReadOnlyRecording({ recording }: { recording: SceneRecording }) {
  const mediaUrl = useMemo(
    () => recording.blob ? URL.createObjectURL(recording.blob) : null,
    [recording.blob]
  );

  return (
    <div className="completed-media-card">
      {recording.caption && (
        <span className="recording-caption">{recording.caption}</span>
      )}
      {recording.type === 'link' && recording.url ? (
        <a href={recording.url} target="_blank" rel="noopener noreferrer" className="scene-recording-link">
          {recording.url}
        </a>
      ) : mediaUrl ? (
        <video controls src={mediaUrl} className="recording-video" />
      ) : null}
    </div>
  );
}

// ---------- Completed Quick Change Card ----------

function CompletedQuickChangeCard({ qc }: { qc: QuickChange }) {
  return (
    <div className="qc-card" style={{ margin: '4px 0 4px 20px' }}>
      <div className="qc-card-content" style={{ cursor: 'default' }}>
        <div className="qc-info">
          <span className="qc-icon">⚡</span>
          <span className="qc-label">{qc.label}</span>
          <span className={`qc-speed-badge qc-speed-${qc.speed}`}>
            {qc.speed.charAt(0).toUpperCase() + qc.speed.slice(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
