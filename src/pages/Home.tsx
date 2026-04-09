import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Show } from '../db/database';

export default function Home() {
  const navigate = useNavigate();

  // useLiveQuery subscribes to IndexedDB — whenever the 'shows' table
  // changes, this component re-renders automatically with fresh data.
  const activeShows = useLiveQuery(
    () => db.shows.where('isCompleted').equals(0).toArray()
  );

  // Form state for creating a new show
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [rolesInput, setRolesInput] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState('');

  async function createShow() {
    if (!name.trim()) return;

    // Split comma-separated roles into an array, trimming whitespace
    const roles = rolesInput
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    await db.shows.add({
      name: name.trim(),
      roles,
      isCompleted: 0,
      completedAt: null,
      createdAt: new Date(),
    });

    // Reset form
    setName('');
    setRolesInput('');
    setShowForm(false);
  }

  function startEdit(show: Show) {
    setEditingId(show.id!);
    setEditName(show.name);
    setEditRoles(show.roles.join(', '));
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;

    const roles = editRoles
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    await db.shows.update(editingId, {
      name: editName.trim(),
      roles,
    });

    setEditingId(null);
  }

  async function deleteShow(id: number) {
    // Delete the show and all its related data
    await db.transaction('rw', [db.shows, db.musicalNumbers, db.harmonies, db.danceVideos, db.scenes, db.sceneRecordings], async () => {
      const numbers = await db.musicalNumbers.where('showId').equals(id).toArray();
      const numberIds = numbers.map((n) => n.id!);

      await db.harmonies.where('musicalNumberId').anyOf(numberIds).delete();
      await db.danceVideos.where('musicalNumberId').anyOf(numberIds).delete();
      await db.musicalNumbers.where('showId').equals(id).delete();

      const scenes = await db.scenes.where('showId').equals(id).toArray();
      const sceneIds = scenes.map((s) => s.id!);

      await db.sceneRecordings.where('sceneId').anyOf(sceneIds).delete();
      await db.scenes.where('showId').equals(id).delete();

      await db.shows.delete(id);
    });
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>greenroom</h1>
        <button
          className="icon-btn"
          onClick={() => navigate('/completed')}
          title="Completed Shows"
        >
          🏆
        </button>
      </header>

      {/* Active shows list */}
      <div className="show-list">
        {activeShows === undefined ? (
          <p className="empty-state">Loading...</p>
        ) : activeShows.length === 0 ? (
          <p className="empty-state">No active shows yet. Create one to get started!</p>
        ) : (
          activeShows.map((show) => (
            <div key={show.id} className="show-card">
              {editingId === show.id ? (
                <div className="show-edit-form">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Show name"
                    className="input"
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
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  className="show-card-content"
                  onClick={() => navigate(`/show/${show.id}`)}
                >
                  <div className="show-info">
                    <span className="show-name">{show.name}</span>
                    {show.roles.length > 0 && (
                      <span className="show-roles">{show.roles.join(', ')}</span>
                    )}
                  </div>
                  <div className="show-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn small" onClick={() => startEdit(show)} title="Edit">
                      ✏️
                    </button>
                    <button className="icon-btn small" onClick={() => deleteShow(show.id!)} title="Delete">
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New show form */}
      {showForm ? (
        <div className="new-show-form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Show name"
            className="input"
            autoFocus
          />
          <input
            type="text"
            value={rolesInput}
            onChange={(e) => setRolesInput(e.target.value)}
            placeholder="Your role(s), comma-separated"
            className="input"
          />
          <div className="btn-row">
            <button className="btn btn-primary" onClick={createShow}>
              Create Show
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary add-show-btn" onClick={() => setShowForm(true)}>
          + New Show
        </button>
      )}
    </div>
  );
}
