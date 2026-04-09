import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type QuickChangeSpeed } from '../db/database';

export default function Scenes() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const id = Number(showId);

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

  // ===== Drag-and-drop state =====
  // We use refs for the hot path (touchmove) to avoid React re-renders,
  // and state only for the visual indicator (drop target) which needs to render.
  const dragQCIdRef = useRef<number | null>(null);
  const dragCloneRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetY = useRef(0);
  const dragOffsetX = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null); // afterSceneOrder we'd drop into
  const [draggingId, setDraggingId] = useState<number | null>(null); // triggers re-render to hide original

  // Build an ordered list of "slots" — the afterSceneOrder values between scenes.
  // Slot 0 = before first scene, then each scene's order = after that scene.
  // We compute their Y midpoints during drag from the DOM.
  const getDropSlots = useCallback((): { afterOrder: number; y: number }[] => {
    if (!listRef.current || !scenes) return [];
    const slots: { afterOrder: number; y: number }[] = [];
    const listRect = listRef.current.getBoundingClientRect();

    // Slot before first scene: top of the list
    const firstScene = listRef.current.querySelector('[data-scene-order]') as HTMLElement | null;
    if (firstScene) {
      const r = firstScene.getBoundingClientRect();
      slots.push({ afterOrder: 0, y: r.top - 6 });
    } else {
      slots.push({ afterOrder: 0, y: listRect.top });
    }

    // Slot after each scene: bottom edge of each scene card
    const sceneCards = listRef.current.querySelectorAll('[data-scene-order]');
    sceneCards.forEach((el) => {
      const order = parseInt(el.getAttribute('data-scene-order')!, 10);
      const r = el.getBoundingClientRect();
      slots.push({ afterOrder: order, y: r.bottom + 6 });
    });

    return slots;
  }, [scenes]);

  const findClosestSlot = useCallback((clientY: number): number | null => {
    const slots = getDropSlots();
    if (slots.length === 0) return null;
    let closest = slots[0];
    let minDist = Math.abs(clientY - closest.y);
    for (let i = 1; i < slots.length; i++) {
      const dist = Math.abs(clientY - slots[i].y);
      if (dist < minDist) {
        minDist = dist;
        closest = slots[i];
      }
    }
    return closest.afterOrder;
  }, [getDropSlots]);

  // Shared drag start — creates a floating clone positioned at the touch/mouse point
  const startDrag = useCallback((qcId: number, clientX: number, clientY: number, sourceEl: HTMLElement) => {
    dragQCIdRef.current = qcId;

    // Find the .qc-card ancestor to clone
    const card = sourceEl.closest('.qc-card') as HTMLElement;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    dragOffsetX.current = clientX - rect.left;
    dragOffsetY.current = clientY - rect.top;

    // Create floating clone
    const clone = card.cloneNode(true) as HTMLDivElement;
    clone.classList.add('qc-drag-clone');
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.zIndex = '3000';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    dragCloneRef.current = clone;

    setDraggingId(qcId);
    setDropTarget(findClosestSlot(clientY));
  }, [findClosestSlot]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragCloneRef.current) return;
    dragCloneRef.current.style.left = `${clientX - dragOffsetX.current}px`;
    dragCloneRef.current.style.top = `${clientY - dragOffsetY.current}px`;
    setDropTarget(findClosestSlot(clientY));
  }, [findClosestSlot]);

  const endDrag = useCallback(async () => {
    const qcId = dragQCIdRef.current;
    const target = dropTarget;

    // Clean up clone
    if (dragCloneRef.current) {
      dragCloneRef.current.remove();
      dragCloneRef.current = null;
    }
    dragQCIdRef.current = null;
    setDraggingId(null);
    setDropTarget(null);

    // Update DB if we have a valid drop
    if (qcId !== null && target !== null) {
      await db.quickChanges.update(qcId, { afterSceneOrder: target });
    }
  }, [dropTarget]);

  // Touch handlers for the drag handle
  const onHandleTouchStart = useCallback((e: React.TouchEvent, qcId: number) => {
    // Prevent the page from scrolling while we decide if this is a drag
    const touch = e.touches[0];
    const el = e.currentTarget as HTMLElement;
    startDrag(qcId, touch.clientX, touch.clientY, el);
  }, [startDrag]);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragQCIdRef.current) return;
    e.preventDefault(); // prevent scroll while dragging
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  }, [moveDrag]);

  const onHandleTouchEnd = useCallback(() => {
    if (!dragQCIdRef.current) return;
    endDrag();
  }, [endDrag]);

  // Mouse handlers for desktop
  const onHandleMouseDown = useCallback((e: React.MouseEvent, qcId: number) => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    startDrag(qcId, e.clientX, e.clientY, el);
  }, [startDrag]);

  // Global mouse move/up listeners — attached when dragging
  useEffect(() => {
    if (draggingId === null) return;

    const onMouseMove = (e: MouseEvent) => {
      moveDrag(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      endDrag();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggingId, moveDrag, endDrag]);

  // ===== Scene CRUD =====

  async function addScene() {
    if (!newName.trim()) return;
    const order = newOrder.trim()
      ? parseInt(newOrder, 10)
      : (scenes?.length ?? 0) + 1;

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

  // ===== Quick Change CRUD =====

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

  // ===== Render helpers =====

  function renderInterleavedList() {
    const items: React.ReactElement[] = [];

    // Drop indicator before first scene (slot 0)
    if (dropTarget === 0) {
      items.push(<div key="drop-0" className="qc-drop-indicator" />);
    }

    // Quick changes before first scene
    const beforeFirst = quickChanges!.filter(qc => qc.afterSceneOrder === 0);
    beforeFirst.forEach(qc => items.push(renderQuickChangeCard(qc)));

    for (const scene of scenes!) {
      items.push(
        <div
          key={`scene-${scene.id}`}
          data-scene-order={scene.order}
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

      // Drop indicator after this scene
      if (dropTarget === scene.order) {
        items.push(<div key={`drop-${scene.order}`} className="qc-drop-indicator" />);
      }

      // Quick changes after this scene
      const afterThis = quickChanges!.filter(qc => qc.afterSceneOrder === scene.order);
      afterThis.forEach(qc => items.push(renderQuickChangeCard(qc)));
    }

    // Orphaned quick changes (afterSceneOrder beyond any existing scene)
    const maxOrder = scenes!.length > 0 ? Math.max(...scenes!.map(s => s.order)) : 0;
    const orphaned = quickChanges!.filter(qc =>
      qc.afterSceneOrder > maxOrder && qc.afterSceneOrder !== 0
    );
    orphaned.forEach(qc => items.push(renderQuickChangeCard(qc)));

    return items;
  }

  function renderQuickChangeCard(qc: { id?: number; label: string; speed: QuickChangeSpeed; afterSceneOrder: number }) {
    const speedClass = `qc-speed-${qc.speed}`;
    const isBeingDragged = draggingId === qc.id;

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
      <div
        key={`qc-${qc.id}`}
        className={`qc-card ${isBeingDragged ? 'qc-card-dragging' : ''}`}
      >
        <div className="qc-card-content">
          {/* Drag handle — touch/mouse drag ONLY activates here */}
          <span
            className="qc-drag-handle"
            onTouchStart={(e) => onHandleTouchStart(e, qc.id!)}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
            onMouseDown={(e) => onHandleMouseDown(e, qc.id!)}
          >
            ≡
          </span>
          <div className="qc-info" onClick={() => startEditQC(qc)}>
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
      <div className="scene-list" ref={listRef}>
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
