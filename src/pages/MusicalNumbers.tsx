import { useState } from 'react';
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
  const [newOrder, setNewOrder] = useState('');
  const [orderError, setOrderError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  async function addNumber() {
    if (!newName.trim()) return;

    // If no order given, auto-assign the next number in sequence
    const order = newOrder.trim()
      ? parseInt(newOrder, 10)
      : (numbers?.length ?? 0) + 1;

    // Check for duplicate order within this show
    const duplicate = numbers?.find(n => n.order === order);
    if (duplicate) {
      setOrderError(`Order #${order} is already used by "${duplicate.name}".`);
      return;
    }

    setOrderError('');
    await db.musicalNumbers.add({
      showId: id,
      name: newName.trim(),
      order,
      notes: '',
      createdAt: new Date(),
    });

    setNewName('');
    setNewOrder('');
    setShowAddForm(false);
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
              <div
                className="number-card-content"
                onClick={() => navigate(`/show/${id}/numbers/${num.id}`)}
              >
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
          <input
            type="text"
            value={newOrder}
            onChange={(e) => setNewOrder(e.target.value)}
            placeholder="Order in show (optional)"
            className="input"
            inputMode="numeric"
          />
          {orderError && <p className="error-text">{orderError}</p>}
          <div className="btn-row">
            <button className="btn btn-primary" onClick={addNumber}>Add Number</button>
            <button className="btn btn-secondary" onClick={() => { setShowAddForm(false); setOrderError(''); }}>Cancel</button>
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
