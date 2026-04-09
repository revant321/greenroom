import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export default function MusicalNumbers() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const id = Number(showId);

  // Load the show (for its name in the header) and its musical numbers
  const show = useLiveQuery(() => db.shows.get(id), [id]);
  const numbers = useLiveQuery(
    () => db.musicalNumbers.where('showId').equals(id).sortBy('order'),
    [id]
  );

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ===== Drag-and-drop state =====
  const dragIdRef = useRef<number | null>(null);
  const dragCloneRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetY = useRef(0);
  const dragOffsetX = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const getDropSlots = useCallback((): { index: number; y: number }[] => {
    if (!listRef.current || !numbers) return [];
    const cards = listRef.current.querySelectorAll('[data-num-index]');
    const slots: { index: number; y: number }[] = [];

    cards.forEach((el) => {
      const idx = parseInt(el.getAttribute('data-num-index')!, 10);
      const r = el.getBoundingClientRect();
      slots.push({ index: idx, y: r.top + r.height / 2 });
    });

    return slots;
  }, [numbers]);

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
    return closest.index;
  }, [getDropSlots]);

  const startDrag = useCallback((numId: number, clientX: number, clientY: number, sourceEl: HTMLElement) => {
    dragIdRef.current = numId;
    const card = sourceEl.closest('.number-card') as HTMLElement;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    dragOffsetX.current = clientX - rect.left;
    dragOffsetY.current = clientY - rect.top;

    const clone = card.cloneNode(true) as HTMLDivElement;
    clone.classList.add('drag-clone');
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.zIndex = '3000';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    dragCloneRef.current = clone;

    setDraggingId(numId);
    setDropTarget(findClosestSlot(clientY));
  }, [findClosestSlot]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragCloneRef.current) return;
    dragCloneRef.current.style.left = `${clientX - dragOffsetX.current}px`;
    dragCloneRef.current.style.top = `${clientY - dragOffsetY.current}px`;
    setDropTarget(findClosestSlot(clientY));
  }, [findClosestSlot]);

  const endDrag = useCallback(async () => {
    const draggedId = dragIdRef.current;
    const targetIndex = dropTarget;

    if (dragCloneRef.current) {
      dragCloneRef.current.remove();
      dragCloneRef.current = null;
    }
    dragIdRef.current = null;
    setDraggingId(null);
    setDropTarget(null);

    if (draggedId === null || targetIndex === null || !numbers) return;

    // Build the new order: remove dragged item, insert at target index
    const ordered = [...numbers];
    const fromIdx = ordered.findIndex(n => n.id === draggedId);
    if (fromIdx === -1) return;

    const [moved] = ordered.splice(fromIdx, 1);
    // Adjust target: if dragging down, the index shifted after removal
    const toIdx = targetIndex > fromIdx ? targetIndex - 1 : targetIndex;
    ordered.splice(toIdx, 0, moved);

    // Update all orders sequentially (1-based)
    await db.transaction('rw', db.musicalNumbers, async () => {
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].order !== i + 1) {
          await db.musicalNumbers.update(ordered[i].id!, { order: i + 1 });
        }
      }
    });
  }, [dropTarget, numbers]);

  const onHandleTouchStart = useCallback((e: React.TouchEvent, numId: number) => {
    const touch = e.touches[0];
    startDrag(numId, touch.clientX, touch.clientY, e.currentTarget as HTMLElement);
  }, [startDrag]);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragIdRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  }, [moveDrag]);

  const onHandleTouchEnd = useCallback(() => {
    if (!dragIdRef.current) return;
    endDrag();
  }, [endDrag]);

  const onHandleMouseDown = useCallback((e: React.MouseEvent, numId: number) => {
    e.preventDefault();
    startDrag(numId, e.clientX, e.clientY, e.currentTarget as HTMLElement);
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

  async function addNumber() {
    if (!newName.trim()) return;
    const order = (numbers?.length ?? 0) + 1;

    await db.musicalNumbers.add({
      showId: id,
      name: newName.trim(),
      order,
      notes: '',
      createdAt: new Date(),
    });

    setNewName('');
    setShowAddForm(false);
  }

  async function deleteNumber(numberId: number) {
    await db.transaction('rw', [db.musicalNumbers, db.harmonies, db.danceVideos], async () => {
      await db.harmonies.where('musicalNumberId').equals(numberId).delete();
      await db.danceVideos.where('musicalNumberId').equals(numberId).delete();
      await db.musicalNumbers.delete(numberId);
    });

    // Recalculate sequential orders after deletion
    const remaining = await db.musicalNumbers.where('showId').equals(id).sortBy('order');
    await db.transaction('rw', db.musicalNumbers, async () => {
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i + 1) {
          await db.musicalNumbers.update(remaining[i].id!, { order: i + 1 });
        }
      }
    });
  }

  if (show === undefined || numbers === undefined) {
    return <div className="page"><p>Loading...</p></div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(`/show/${id}`)}>
          ← {show?.name ?? 'Back'}
        </button>
      </header>

      <h2 className="section-title">Musical Numbers</h2>

      {/* List of numbers */}
      <div className="number-list" ref={listRef}>
        {numbers.length === 0 ? (
          <p className="empty-state">No musical numbers yet. Add your first one!</p>
        ) : (
          numbers.map((num, idx) => (
            <div
              key={num.id}
              data-num-index={idx}
              className={`number-card ${draggingId === num.id ? 'card-dragging' : ''}`}
            >
              {dropTarget === idx && draggingId !== num.id && (
                <div className="drop-indicator" />
              )}
              <div
                className="number-card-content"
                onClick={() => navigate(`/show/${id}/numbers/${num.id}`)}
              >
                <span
                  className="drag-handle"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => onHandleTouchStart(e, num.id!)}
                  onTouchMove={onHandleTouchMove}
                  onTouchEnd={onHandleTouchEnd}
                  onMouseDown={(e) => { e.stopPropagation(); onHandleMouseDown(e, num.id!); }}
                >
                  ≡
                </span>
                <div className="number-info">
                  <span className="number-order">#{num.order}</span>
                  <span className="number-name">{num.name}</span>
                </div>
                <div className="show-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn small delete-x-btn" onClick={() => setDeleteConfirmId(num.id!)} title="Delete">
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add new number form */}
      {showAddForm ? (
        <div className="add-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Number name (e.g. 'Defying Gravity')"
            className="input"
            autoFocus
          />
          <div className="btn-row">
            <button className="btn btn-primary" onClick={addNumber}>Add Number</button>
            <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary add-show-btn" onClick={() => setShowAddForm(true)}>
          + Add Musical Number
        </button>
      )}

      {deleteConfirmId !== null && (
        <div className="delete-confirm-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Number</h3>
            <p>This will permanently delete this musical number and all its data.</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-btn delete-confirm-btn-confirm" onClick={() => { deleteNumber(deleteConfirmId); setDeleteConfirmId(null); }}>
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
