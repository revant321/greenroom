import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export default function ShowHub() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const id = Number(showId);

  // Live-subscribe to this show's data — re-renders whenever it changes in IndexedDB
  const show = useLiveQuery(() => db.shows.get(id), [id]);

  // Edit form state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState('');

  // Completion confirmation state
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  if (show === undefined) return <div className="page"><p>Loading...</p></div>;
  if (show === null) return <div className="page"><p>Show not found.</p></div>;

  function startEdit() {
    setEditName(show!.name);
    setEditRoles(show!.roles.join(', '));
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim()) return;

    const roles = editRoles
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    await db.shows.update(id, { name: editName.trim(), roles });
    setEditing(false);
  }

  async function markCompleted() {
    // For now, simply mark it completed with a timestamp.
    // Phase 6 will add the full "delete media" confirmation flow.
    await db.shows.update(id, {
      isCompleted: 1,
      completedAt: new Date(),
    });
    // Navigate back to homepage — show will disappear from active list
    navigate('/');
  }

  return (
    <div className="page">
      {/* Header with back button */}
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
      </header>

      {/* Show title and roles */}
      <div className="hub-title-section">
        {editing ? (
          <div className="hub-edit-form">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Show name"
              className="input"
              autoFocus
            />
            <input
              type="text"
              value={editRoles}
              onChange={(e) => setEditRoles(e.target.value)}
              placeholder="Roles (comma-separated)"
              className="input"
            />
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

      {/* Two main navigation buttons — the core of Show Hub */}
      <div className="hub-nav-buttons">
        <button
          className="hub-nav-btn"
          onClick={() => navigate(`/show/${id}/numbers`)}
        >
          <span className="hub-nav-icon">🎵</span>
          <span className="hub-nav-label">Musical Numbers</span>
        </button>
        <button
          className="hub-nav-btn"
          onClick={() => navigate(`/show/${id}/scenes`)}
        >
          <span className="hub-nav-icon">🎬</span>
          <span className="hub-nav-label">Scenes</span>
        </button>
      </div>

      {/* Mark as completed */}
      <div className="hub-complete-section">
        {showCompleteConfirm ? (
          <div className="complete-confirm">
            <p>Mark "<strong>{show.name}</strong>" as completed?</p>
            <p className="complete-hint">You can still view it in Completed Shows.</p>
            <div className="btn-row">
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
