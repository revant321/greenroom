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
  const [newIsUserIn, setNewIsUserIn] = useState(true);
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

  // ===== Drag-and-drop state (shared for QCs and Scenes) =====
  const dragTypeRef = useRef<'qc' | 'scene' | null>(null);
  const dragItemIdRef = useRef<number | null>(null);
  const dragCloneRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetY = useRef(0);
  const dragOffsetX = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingType, setDraggingType] = useState<'qc' | 'scene' | null>(null);

  // ===== QC drop slots (between scenes) =====
  const getQCDropSlots = useCallback((): { afterOrder: number; y: number }[] => {
    if (!listRef.current || !scenes) return [];
    const slots: { afterOrder: number; y: number }[] = [];

    const firstScene = listRef.current.querySelector('[data-scene-order]') as HTMLElement | null;
    if (firstScene) {
      const r = firstScene.getBoundingClientRect();
      slots.push({ afterOrder: 0, y: r.top - 6 });
    } else {
      const listRect = listRef.current.getBoundingClientRect();
      slots.push({ afterOrder: 0, y: listRect.top });
    }

    const sceneCards = listRef.current.querySelectorAll('[data-scene-order]');
    sceneCards.forEach((el) => {
      const order = parseInt(el.getAttribute('data-scene-order')!, 10);
      const r = el.getBoundingClientRect();
      slots.push({ afterOrder: order, y: r.bottom + 6 });
    });

    return slots;
  }, [scenes]);

  const findClosestQCSlot = useCallback((clientY: number): number | null => {
    const slots = getQCDropSlots();
    if (slots.length === 0) return null;
    let closest = slots[0];
    let minDist = Math.abs(clientY - closest.y);
    for (let i = 1; i < slots.length; i++) {
      const dist = Math.abs(clientY - slots[i].y);
      if (dist < minDist) { minDist = dist; closest = slots[i]; }
    }
    return closest.afterOrder;
  }, [getQCDropSlots]);

  // ===== Scene drop slots (reorder among scenes) =====
  const getSceneDropSlots = useCallback((): { index: number; y: number }[] => {
    if (!listRef.current || !scenes) return [];
    const cards = listRef.current.querySelectorAll('[data-scene-index]');
    const slots: { index: number; y: number }[] = [];
    cards.forEach((el) => {
      const idx = parseInt(el.getAttribute('data-scene-index')!, 10);
      const r = el.getBoundingClientRect();
      slots.push({ index: idx, y: r.top + r.height / 2 });
    });
    return slots;
  }, [scenes]);

  const findClosestSceneSlot = useCallback((clientY: number): number | null => {
    const slots = getSceneDropSlots();
    if (slots.length === 0) return null;
    let closest = slots[0];
    let minDist = Math.abs(clientY - closest.y);
    for (let i = 1; i < slots.length; i++) {
      const dist = Math.abs(clientY - slots[i].y);
      if (dist < minDist) { minDist = dist; closest = slots[i]; }
    }
    return closest.index;
  }, [getSceneDropSlots]);

  // ===== Shared drag logic =====
  const startDrag = useCallback((type: 'qc' | 'scene', itemId: number, clientX: number, clientY: number, sourceEl: HTMLElement) => {
    dragTypeRef.current = type;
    dragItemIdRef.current = itemId;

    const cardClass = type === 'qc' ? '.qc-card' : '.scene-card';
    const card = sourceEl.closest(cardClass) as HTMLElement;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    dragOffsetX.current = clientX - rect.left;
    dragOffsetY.current = clientY - rect.top;

    const clone = card.cloneNode(true) as HTMLDivElement;
    clone.classList.add(type === 'qc' ? 'qc-drag-clone' : 'drag-clone');
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.zIndex = '3000';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    dragCloneRef.current = clone;

    setDraggingId(itemId);
    setDraggingType(type);
    setDropTarget(type === 'qc' ? findClosestQCSlot(clientY) : findClosestSceneSlot(clientY));
  }, [findClosestQCSlot, findClosestSceneSlot]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragCloneRef.current) return;
    dragCloneRef.current.style.left = `${clientX - dragOffsetX.current}px`;
    dragCloneRef.current.style.top = `${clientY - dragOffsetY.current}px`;
    const type = dragTypeRef.current;
    setDropTarget(type === 'qc' ? findClosestQCSlot(clientY) : findClosestSceneSlot(clientY));
  }, [findClosestQCSlot, findClosestSceneSlot]);

  const endDrag = useCallback(async () => {
    const type = dragTypeRef.current;
    const itemId = dragItemIdRef.current;
    const target = dropTarget;

    if (dragCloneRef.current) {
      dragCloneRef.current.remove();
      dragCloneRef.current = null;
    }
    dragTypeRef.current = null;
    dragItemIdRef.current = null;
    setDraggingId(null);
    setDraggingType(null);
    setDropTarget(null);

    if (itemId === null || target === null) return;

    if (type === 'qc') {
      await db.quickChanges.update(itemId, { afterSceneOrder: target });
    } else if (type === 'scene' && scenes) {
      const ordered = [...scenes];
      const fromIdx = ordered.findIndex(s => s.id === itemId);
      if (fromIdx === -1) return;

      const [moved] = ordered.splice(fromIdx, 1);
      const toIdx = target > fromIdx ? target - 1 : target;
      ordered.splice(toIdx, 0, moved);

      // Build old→new order mapping for QC afterSceneOrder updates
      const newOrderMap = new Map<number, number>();
      for (let i = 0; i < ordered.length; i++) {
        newOrderMap.set(ordered[i].order, i + 1);
      }

      await db.transaction('rw', [db.scenes, db.quickChanges], async () => {
        // Update scene orders
        for (let i = 0; i < ordered.length; i++) {
          if (ordered[i].order !== i + 1) {
            await db.scenes.update(ordered[i].id!, { order: i + 1 });
          }
        }
        // Update QC afterSceneOrder to match new scene orders
        if (quickChanges) {
          for (const qc of quickChanges) {
            const newOrder = newOrderMap.get(qc.afterSceneOrder);
            if (newOrder !== undefined && newOrder !== qc.afterSceneOrder) {
              await db.quickChanges.update(qc.id!, { afterSceneOrder: newOrder });
            }
          }
        }
      });
    }
  }, [dropTarget, scenes, quickChanges]);

  // Touch handlers
  const onHandleTouchStart = useCallback((e: React.TouchEvent, type: 'qc' | 'scene', itemId: number) => {
    const touch = e.touches[0];
    startDrag(type, itemId, touch.clientX, touch.clientY, e.currentTarget as HTMLElement);
  }, [startDrag]);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragItemIdRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  }, [moveDrag]);

  const onHandleTouchEnd = useCallback(() => {
    if (!dragItemIdRef.current) return;
    endDrag();
  }, [endDrag]);

  // Mouse handlers
  const onHandleMouseDown = useCallback((e: React.MouseEvent, type: 'qc' | 'scene', itemId: number) => {
    e.preventDefault();
    startDrag(type, itemId, e.clientX, e.clientY, e.currentTarget as HTMLElement);
  }, [startDrag]);

  useEffect(() => {
    if (draggingId === null) return;
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();
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
    const order = (scenes?.length ?? 0) + 1;

    await db.scenes.add({
      showId: id,
      name: newName.trim(),
      order,
      isUserInScene: newIsUserIn,
      notes: '',
      createdAt: new Date(),
    });

    setNewName('');
    setNewIsUserIn(true);
    setShowAddForm(false);
  }

  async function deleteScene(sceneId: number) {
    await db.transaction('rw', [db.scenes, db.sceneRecordings], async () => {
      await db.sceneRecordings.where('sceneId').equals(sceneId).delete();
      await db.scenes.delete(sceneId);
    });

    // Recalculate sequential orders after deletion
    const remaining = await db.scenes.where('showId').equals(id).sortBy('order');
    const oldToNew = new Map<number, number>();
    for (let i = 0; i < remaining.length; i++) {
      oldToNew.set(remaining[i].order, i + 1);
    }

    await db.transaction('rw', [db.scenes, db.quickChanges], async () => {
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i + 1) {
          await db.scenes.update(remaining[i].id!, { order: i + 1 });
        }
      }
      // Update QC afterSceneOrder
      const qcs = await db.quickChanges.where('showId').equals(id).toArray();
      for (const qc of qcs) {
        const newOrder = oldToNew.get(qc.afterSceneOrder);
        if (newOrder !== undefined && newOrder !== qc.afterSceneOrder) {
          await db.quickChanges.update(qc.id!, { afterSceneOrder: newOrder });
        }
      }
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

    // Drop indicator before first scene (QC drag, slot 0)
    if (draggingType === 'qc' && dropTarget === 0) {
      items.push(<div key="drop-0" className="qc-drop-indicator" />);
    }

    // Quick changes before first scene
    const beforeFirst = quickChanges!.filter(qc => qc.afterSceneOrder === 0);
    beforeFirst.forEach(qc => items.push(renderQuickChangeCard(qc)));

    for (let i = 0; i < scenes!.length; i++) {
      const scene = scenes![i];
      const isBeingDragged = draggingType === 'scene' && draggingId === scene.id;

      items.push(
        <div
          key={`scene-${scene.id}`}
          data-scene-order={scene.order}
          data-scene-index={i}
          className={`scene-card ${!scene.isUserInScene ? 'scene-card-inactive' : ''} ${isBeingDragged ? 'card-dragging' : ''}`}
        >
          {draggingType === 'scene' && dropTarget === i && draggingId !== scene.id && (
            <div className="drop-indicator" />
          )}
          <div
            className="scene-card-content"
            onClick={scene.isUserInScene
              ? () => navigate(`/show/${id}/scenes/${scene.id}`)
              : undefined}
            style={scene.isUserInScene ? { cursor: 'pointer' } : { cursor: 'default' }}
          >
            <span
              className="drag-handle"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => onHandleTouchStart(e, 'scene', scene.id!)}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={onHandleTouchEnd}
              onMouseDown={(e) => { e.stopPropagation(); onHandleMouseDown(e, 'scene', scene.id!); }}
            >
              ≡
            </span>
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

      // Drop indicator after this scene (QC drag)
      if (draggingType === 'qc' && dropTarget === scene.order) {
        items.push(<div key={`drop-${scene.order}`} className="qc-drop-indicator" />);
      }

      // Quick changes after this scene
      const afterThis = quickChanges!.filter(qc => qc.afterSceneOrder === scene.order);
      afterThis.forEach(qc => items.push(renderQuickChangeCard(qc)));
    }

    // Orphaned quick changes
    const maxOrder = scenes!.length > 0 ? Math.max(...scenes!.map(s => s.order)) : 0;
    const orphaned = quickChanges!.filter(qc =>
      qc.afterSceneOrder > maxOrder && qc.afterSceneOrder !== 0
    );
    orphaned.forEach(qc => items.push(renderQuickChangeCard(qc)));

    return items;
  }

  function renderQuickChangeCard(qc: { id?: number; label: string; speed: QuickChangeSpeed; afterSceneOrder: number }) {
    const speedClass = `qc-speed-${qc.speed}`;
    const isBeingDragged = draggingType === 'qc' && draggingId === qc.id;

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
          <span
            className="qc-drag-handle"
            onTouchStart={(e) => onHandleTouchStart(e, 'qc', qc.id!)}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
            onMouseDown={(e) => onHandleMouseDown(e, 'qc', qc.id!)}
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
