import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MusicalNumber } from '../db/database';

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
  const [newOrder, setNewOrder] = useState('');

  // Edit state — tracks which number is being edited
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState('');

  async function addNumber() {
    if (!newName.trim()) return;

    // If no order given, auto-assign the next number in sequence
    const order = newOrder.trim()
      ? parseInt(newOrder, 10)
      : (numbers?.length ?? 0) + 1;

    await db.musicalNumbers.add({
      showId: id,
      name: newName.trim(),
      order,
      notes: '',           // starts empty — user fills in on the detail page
      createdAt: new Date(),
    });

    setNewName('');
    setNewOrder('');
    setShowAddForm(false);
  }

  function startEdit(num: MusicalNumber) {
    setEditingId(num.id!);
    setEditName(num.name);
    setEditOrder(String(num.order));
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;

    await db.musicalNumbers.update(editingId, {
      name: editName.trim(),
      order: parseInt(editOrder, 10) || 0,
    });

    setEditingId(null);
  }

  async function deleteNumber(numberId: number) {
    // Delete the number and its related harmonies and dance videos
    await db.transaction('rw', [db.musicalNumbers, db.harmonies, db.danceVideos], async () => {
      await db.harmonies.where('musicalNumberId').equals(numberId).delete();
      await db.danceVideos.where('musicalNumberId').equals(numberId).delete();
      await db.musicalNumbers.delete(numberId);
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
      <div className="number-list">
        {numbers.length === 0 ? (
          <p className="empty-state">No musical numbers yet. Add your first one!</p>
        ) : (
          numbers.map((num) => (
            <div key={num.id} className="number-card">
              {editingId === num.id ? (
                <div className="number-edit-form">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Number name"
                    className="input"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editOrder}
                    onChange={(e) => setEditOrder(e.target.value)}
                    placeholder="Order in show"
                    className="input"
                    inputMode="numeric"
                  />
                  <div className="btn-row">
                    <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  className="number-card-content"
                  onClick={() => navigate(`/show/${id}/numbers/${num.id}`)}
                >
                  <div className="number-info">
                    <span className="number-order">#{num.order}</span>
                    <span className="number-name">{num.name}</span>
                  </div>
                  <div className="show-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn small" onClick={() => startEdit(num)} title="Edit">
                      ✏️
                    </button>
                    <button className="icon-btn small" onClick={() => deleteNumber(num.id!)} title="Delete">
                      🗑️
                    </button>
                  </div>
                </div>
              )}
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
          <input
            type="text"
            value={newOrder}
            onChange={(e) => setNewOrder(e.target.value)}
            placeholder="Order in show (optional)"
            className="input"
            inputMode="numeric"
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
    </div>
  );
}
