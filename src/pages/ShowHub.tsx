import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { exportShowAsGrm } from '../utils/showExportImport';

export default function ShowHub() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const id = Number(showId);

  const show = useLiveQuery(() => db.shows.get(id), [id]);

  // Edit form state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState('');

  // Export state
  const [exporting, setExporting] = useState(false);

  // Completion confirmation state + toggles for what to delete
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [deleteAudio, setDeleteAudio] = useState(false);
  const [deleteVideo, setDeleteVideo] = useState(false);
  const [deleteLinks, setDeleteLinks] = useState(false);
  const [deleteSheetMusic, setDeleteSheetMusic] = useState(false);

  if (show === undefined) return <div className="page"><p>Loading...</p></div>;
  if (show === null) return <div className="page"><p>Show not found.</p></div>;

  function startEdit() {
    setEditName(show!.name);
    setEditRoles(show!.roles.join(', '));
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim()) return;
    const roles = editRoles.split(',').map((r) => r.trim()).filter(Boolean);
    await db.shows.update(id, { name: editName.trim(), roles });
    setEditing(false);
  }

  async function markCompleted() {
    // Run all deletions in a single transaction for atomicity
    // Quick changes are structural — they stay on completion (like scenes/numbers).
    await db.transaction('rw', [db.shows, db.musicalNumbers, db.harmonies, db.danceVideos, db.sheetMusic, db.scenes, db.sceneRecordings, db.quickChanges], async () => {
      const numbers = await db.musicalNumbers.where('showId').equals(id).toArray();
      const numberIds = numbers.map((n) => n.id!);
      const scenes = await db.scenes.where('showId').equals(id).toArray();
      const sceneIds = scenes.map((s) => s.id!);

      if (deleteAudio) {
        // Delete harmony audio blobs
        await db.harmonies.where('musicalNumberId').anyOf(numberIds).delete();
      }

      if (deleteVideo) {
        // Delete uploaded/recorded dance videos + scene video recordings
        const fileVideoIds = (await db.danceVideos.where('musicalNumberId').anyOf(numberIds).toArray())
          .filter((v) => v.type === 'file')
          .map((v) => v.id!);
        if (fileVideoIds.length) await db.danceVideos.bulkDelete(fileVideoIds);

        const videoRecIds = (await db.sceneRecordings.where('sceneId').anyOf(sceneIds).toArray())
          .filter((r) => r.type === 'video')
          .map((r) => r.id!);
        if (videoRecIds.length) await db.sceneRecordings.bulkDelete(videoRecIds);
      }

      if (deleteLinks) {
        const linkVideoIds = (await db.danceVideos.where('musicalNumberId').anyOf(numberIds).toArray())
          .filter((v) => v.type === 'link')
          .map((v) => v.id!);
        if (linkVideoIds.length) await db.danceVideos.bulkDelete(linkVideoIds);
      }

      if (deleteSheetMusic) {
        // Only delete uploaded PDFs — links take no storage and are preserved
        const fileSheetIds = (await db.sheetMusic.where('musicalNumberId').anyOf(numberIds).toArray())
          .filter((s) => s.type === 'file')
          .map((s) => s.id!);
        if (fileSheetIds.length) await db.sheetMusic.bulkDelete(fileSheetIds);
      }

      // Notes are always deleted
      for (const n of numbers) {
        await db.musicalNumbers.update(n.id!, { notes: '' });
      }
      for (const s of scenes) {
        await db.scenes.update(s.id!, { notes: '' });
      }

      // Mark completed
      await db.shows.update(id, {
        isCompleted: 1,
        completedAt: new Date(),
      });
    });

    navigate('/');
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
      </header>

      <div className="hub-title-section">
        {editing ? (
          <div className="hub-edit-form">
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Show name" className="input" autoFocus />
            <input type="text" value={editRoles} onChange={(e) => setEditRoles(e.target.value)} placeholder="Roles (comma-separated)" className="input" />
            <div className="btn-row">
              <button className="btn btn-primary" onClick={saveEdit}>Save</button>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="hub-show-name">{show.name}</h1>
            {show.roles.length > 0 && (
              <p className="hub-show-roles">{show.roles.join(', ')}</p>
            )}
            <button className="btn-link" onClick={startEdit}>Edit Show Details</button>
          </>
        )}
      </div>

      <div className="hub-nav-buttons">
        <button className="hub-nav-btn" onClick={() => navigate(`/show/${id}/numbers`)}>
          <span className="hub-nav-icon">🎵</span>
          <span className="hub-nav-label">Musical Numbers</span>
        </button>
        <button className="hub-nav-btn" onClick={() => navigate(`/show/${id}/scenes`)}>
          <span className="hub-nav-icon">🎬</span>
          <span className="hub-nav-label">Scenes</span>
        </button>
      </div>

      {/* Export show as .grm */}
      <button
        className="btn btn-secondary complete-btn"
        style={{ marginBottom: 12 }}
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

      {/* Mark as completed — now with four independent delete toggles */}
      <div className="hub-complete-section">
        {showCompleteConfirm ? (
          <div className="complete-confirm">
            <p>Mark "<strong>{show.name}</strong>" as completed?</p>
            <p className="complete-hint">
              Show structure stays. Notes are always deleted. Choose what else to remove:
            </p>

            <div className="complete-toggles">
              <label className="checkbox-label">
                <input type="checkbox" checked={deleteAudio} onChange={(e) => setDeleteAudio(e.target.checked)} />
                Delete audio recordings
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={deleteVideo} onChange={(e) => setDeleteVideo(e.target.checked)} />
                Delete video files
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={deleteLinks} onChange={(e) => setDeleteLinks(e.target.checked)} />
                Delete external links
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={deleteSheetMusic} onChange={(e) => setDeleteSheetMusic(e.target.checked)} />
                Delete uploaded sheet music PDFs
              </label>
            </div>

            <div className="btn-row" style={{ justifyContent: 'center', marginTop: 12 }}>
              <button className="btn btn-primary" onClick={markCompleted}>
                Yes, Complete
              </button>
              <button className="btn btn-secondary" onClick={() => setShowCompleteConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-secondary complete-btn"
            onClick={() => setShowCompleteConfirm(true)}
          >
            Mark Show as Completed
          </button>
        )}
      </div>
    </div>
  );
}
