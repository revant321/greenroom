import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type QuickChangeSpeed } from '../db/database';

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
  const quickChanges = useLiveQuery(
    () => db.quickChanges.where('showId').equals(id).toArray(),
    [id]
  );

  // Add scene form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState('');
  const [newIsUserIn, setNewIsUserIn] = useState(true);
  const [orderError, setOrderError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Add quick change form state
  const [showQCForm, setShowQCForm] = useState(false);
  const [qcLabel, setQcLabel] = useState('');
  const [qcSpeed, setQcSpeed] = useState<QuickChangeSpeed>('ok');
  const [qcAfter, setQcAfter] = useState('');
  const [deleteQCConfirmId, setDeleteQCConfirmId] = useState<number | null>(null);

  // Edit quick change state
  const [editingQCId, setEditingQCId] = useState<number | null>(null);
  const [editQCLabel, setEditQCLabel] = useState('');
  const [editQCSpeed, setEditQCSpeed] = useState<QuickChangeSpeed>('ok');
  const [editQCAfter, setEditQCAfter] = useState('');

  async function addScene() {
    if (!newName.trim()) return;

    const order = newOrder.trim()
      ? parseInt(newOrder, 10)
      : (scenes?.length ?? 0) + 1;

    // Check for duplicate order within this show
    const duplicate = scenes?.find(s => s.order === order);
    if (duplicate) {
      setOrderError(`Order #${order} is already used by "${duplicate.name}".`);
      return;
    }

    setOrderError('');
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
    await db.transaction('rw', [db.scenes, db.sceneRecordings], async () => {
      await db.sceneRecordings.where('sceneId').equals(sceneId).delete();
      await db.scenes.delete(sceneId);
    });
  }

  async function addQuickChange() {
    if (!qcLabel.trim()) return;
    const afterOrder = qcAfter.trim()
      ? parseInt(qcAfter, 10)
      : (scenes && scenes.length > 0 ? scenes[scenes.length - 1].order : 0);

    await db.quickChanges.add({
      showId: id,
      label: qcLabel.trim(),
      speed: qcSpeed,
      afterSceneOrder: afterOrder,
      createdAt: new Date(),
    });

    setQcLabel('');
    setQcSpeed('ok');
    setQcAfter('');
    setShowQCForm(false);
  }

  async function deleteQuickChange(qcId: number) {
    await db.quickChanges.delete(qcId);
  }

  function startEditQC(qc: { id?: number; label: string; speed: QuickChangeSpeed; afterSceneOrder: number }) {
    setEditingQCId(qc.id!);
    setEditQCLabel(qc.label);
    setEditQCSpeed(qc.speed);
    setEditQCAfter(String(qc.afterSceneOrder));
  }

  async function saveEditQC() {
    if (!editingQCId || !editQCLabel.trim()) return;
    await db.quickChanges.update(editingQCId, {
      label: editQCLabel.trim(),
      speed: editQCSpeed,
      afterSceneOrder: parseInt(editQCAfter, 10) || 0,
    });
    setEditingQCId(null);
  }

  if (show === undefined || scenes === undefined || quickChanges === undefined) {
    return <div className="page"><p>Loading...</p></div>;
  }

  // Build interleaved list: scenes with quick changes inserted between them.
  // For each scene, after rendering it, render any quick changes where
  // afterSceneOrder matches that scene's order.
  function renderInterleavedList() {
    const items: JSX.Element[] = [];

    // Quick changes that come before the first scene (afterSceneOrder = 0)
    const beforeFirst = quickChanges!.filter(qc => qc.afterSceneOrder === 0);
    beforeFirst.forEach(qc => items.push(renderQuickChangeCard(qc)));

    for (const scene of scenes!) {
      items.push(
        <div
          key={`scene-${scene.id}`}
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
      );

      // Quick changes that come after this scene
      const afterThis = quickChanges!.filter(qc => qc.afterSceneOrder === scene.order);
      afterThis.forEach(qc => items.push(renderQuickChangeCard(qc)));
    }

    // Quick changes with afterSceneOrder beyond any existing scene
    const maxOrder = scenes!.length > 0 ? Math.max(...scenes!.map(s => s.order)) : 0;
    const orphaned = quickChanges!.filter(qc =>
      qc.afterSceneOrder > maxOrder && qc.afterSceneOrder !== 0
    );
    orphaned.forEach(qc => items.push(renderQuickChangeCard(qc)));

    return items;
  }

  function renderQuickChangeCard(qc: { id?: number; label: string; speed: QuickChangeSpeed; afterSceneOrder: number }) {
    const speedClass = `qc-speed-${qc.speed}`;

    if (editingQCId === qc.id) {
      return (
        <div key={`qc-${qc.id}`} className="qc-card">
          <div className="qc-edit-form">
            <input
              type="text"
              value={editQCLabel}
              onChange={(e) => setEditQCLabel(e.target.value)}
              placeholder="Quick change label"
              className="input"
              autoFocus
            />
            <div className="qc-speed-pills">
              {(['slow', 'ok', 'fast'] as QuickChangeSpeed[]).map(s => (
                <button
                  key={s}
                  className={`qc-speed-pill qc-speed-${s} ${editQCSpeed === s ? 'active' : ''}`}
                  onClick={() => setEditQCSpeed(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <select
              className="input"
              value={editQCAfter}
              onChange={(e) => setEditQCAfter(e.target.value)}
            >
              <option value="0">Before first scene</option>
              {scenes!.map(s => (
                <option key={s.id} value={String(s.order)}>After #{s.order} — {s.name}</option>
              ))}
            </select>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={saveEditQC}>Save</button>
              <button className="btn btn-secondary" onClick={() => setEditingQCId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={`qc-${qc.id}`} className="qc-card">
        <div className="qc-card-content" onClick={() => startEditQC(qc)}>
          <div className="qc-info">
            <span className="qc-icon">⚡</span>
            <span className="qc-label">{qc.label}</span>
            <span className={`qc-speed-badge ${speedClass}`}>
              {qc.speed.charAt(0).toUpperCase() + qc.speed.slice(1)}
            </span>
          </div>
          <div className="show-actions" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn small delete-x-btn" onClick={() => setDeleteQCConfirmId(qc.id!)} title="Delete">
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(`/show/${id}`)}>
          ← {show?.name ?? 'Back'}
        </button>
      </header>

      <h2 className="section-title">Scenes</h2>

      {/* Interleaved list of scenes + quick changes */}
      <div className="scene-list">
        {scenes.length === 0 && quickChanges.length === 0 ? (
          <p className="empty-state">No scenes yet. Add your first one!</p>
        ) : (
          renderInterleavedList()
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
          {orderError && <p className="error-text">{orderError}</p>}
          <div className="btn-row">
            <button className="btn btn-primary" onClick={addScene}>Add Scene</button>
            <button className="btn btn-secondary" onClick={() => { setShowAddForm(false); setOrderError(''); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary add-show-btn" onClick={() => setShowAddForm(true)}>
          + Add Scene
        </button>
      )}

      {/* Add quick change form */}
      {showQCForm ? (
        <div className="add-form" style={{ marginTop: 12 }}>
          <input
            type="text"
            value={qcLabel}
            onChange={(e) => setQcLabel(e.target.value)}
            placeholder="Quick change label (e.g. 'Costume → Act 2')"
            className="input"
            autoFocus
          />
          <div className="qc-speed-pills">
            {(['slow', 'ok', 'fast'] as QuickChangeSpeed[]).map(s => (
              <button
                key={s}
                className={`qc-speed-pill qc-speed-${s} ${qcSpeed === s ? 'active' : ''}`}
                onClick={() => setQcSpeed(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <select
            className="input"
            value={qcAfter}
            onChange={(e) => setQcAfter(e.target.value)}
          >
            <option value="">After last scene</option>
            <option value="0">Before first scene</option>
            {scenes.map(s => (
              <option key={s.id} value={String(s.order)}>After #{s.order} — {s.name}</option>
            ))}
          </select>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={addQuickChange}>Add Quick Change</button>
            <button className="btn btn-secondary" onClick={() => setShowQCForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-secondary add-show-btn"
          style={{ marginTop: 8 }}
          onClick={() => setShowQCForm(true)}
        >
          + Quick Change
        </button>
      )}

      {/* Delete scene confirmation */}
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

      {/* Delete quick change confirmation */}
      {deleteQCConfirmId !== null && (
        <div className="delete-confirm-backdrop" onClick={() => setDeleteQCConfirmId(null)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Quick Change</h3>
            <p>This will permanently delete this quick change.</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-btn delete-confirm-btn-confirm" onClick={() => { deleteQuickChange(deleteQCConfirmId); setDeleteQCConfirmId(null); }}>
                Confirm
              </button>
              <button className="delete-confirm-btn delete-confirm-btn-cancel" onClick={() => setDeleteQCConfirmId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
