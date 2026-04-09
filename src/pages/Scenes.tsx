import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export default function Scenes() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const id = Number(showId);

  // Load the show (for header) and its scenes sorted by order
  const show = useLiveQuery(() => db.shows.get(id), [id]);
  const scenes = useLiveQuery(
    () => db.scenes.where('showId').equals(id).sortBy('order'),
    [id]
  );

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState('');
  const [newIsUserIn, setNewIsUserIn] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  async function addScene() {
    if (!newName.trim()) return;

    const order = newOrder.trim()
      ? parseInt(newOrder, 10)
      : (scenes?.length ?? 0) + 1;

    await db.scenes.add({
      showId: id,
      name: newName.trim(),
      order,
      isUserInScene: newIsUserIn,
      notes: '',
      createdAt: new Date(),
    });

    setNewName('');
    setNewOrder('');
    setNewIsUserIn(true);
    setShowAddForm(false);
  }

  async function deleteScene(sceneId: number) {
    // Delete the scene and its related recordings in a transaction
    await db.transaction('rw', [db.scenes, db.sceneRecordings], async () => {
      await db.sceneRecordings.where('sceneId').equals(sceneId).delete();
      await db.scenes.delete(sceneId);
    });
  }

  if (show === undefined || scenes === undefined) {
    return <div className="page"><p>Loading...</p></div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(`/show/${id}`)}>
          ← {show?.name ?? 'Back'}
        </button>
      </header>

      <h2 className="section-title">Scenes</h2>

      {/* List of scenes */}
      <div className="scene-list">
        {scenes.length === 0 ? (
          <p className="empty-state">No scenes yet. Add your first one!</p>
        ) : (
          scenes.map((scene) => (
            <div
              key={scene.id}
              className={`scene-card ${!scene.isUserInScene ? 'scene-card-inactive' : ''}`}
            >
              <div
                className="scene-card-content"
                onClick={scene.isUserInScene
                  ? () => navigate(`/show/${id}/scenes/${scene.id}`)
                  : undefined}
                style={scene.isUserInScene ? { cursor: 'pointer' } : { cursor: 'default' }}
              >
                <div className="scene-info">
                  <span className="scene-order">#{scene.order}</span>
                  <span className="scene-name">{scene.name}</span>
                  {!scene.isUserInScene && (
                    <span className="scene-not-in-badge">Not in scene</span>
                  )}
                </div>
                <div className="show-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn small delete-x-btn" onClick={() => setDeleteConfirmId(scene.id!)} title="Delete">
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add new scene form */}
      {showAddForm ? (
        <div className="add-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Scene name (e.g. 'Act 1, Scene 3')"
            className="input"
            autoFocus
          />
          <input
            type="text"
            value={newOrder}
            onChange={(e) => setNewOrder(e.target.value)}
            placeholder="Order in show (optional)"
            className="input"
            inputMode="numeric"
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newIsUserIn}
              onChange={(e) => setNewIsUserIn(e.target.checked)}
            />
            I'm in this scene
          </label>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={addScene}>Add Scene</button>
            <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary add-show-btn" onClick={() => setShowAddForm(true)}>
          + Add Scene
        </button>
      )}

      {deleteConfirmId !== null && (
        <div className="delete-confirm-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Scene</h3>
            <p>This will permanently delete this scene and all its recordings.</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-btn delete-confirm-btn-confirm" onClick={() => { deleteScene(deleteConfirmId); setDeleteConfirmId(null); }}>
                Confirm
              </button>
              <button className="delete-confirm-btn delete-confirm-btn-cancel" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
