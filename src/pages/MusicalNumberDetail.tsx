import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import HarmonyRecorder from '../components/HarmonyRecorder';
import HarmonyPlayer from '../components/HarmonyPlayer';

export default function MusicalNumberDetail() {
  const { showId, numberId } = useParams<{ showId: string; numberId: string }>();
  const navigate = useNavigate();
  const numId = Number(numberId);

  // Live-subscribe to this musical number's data
  const number = useLiveQuery(() => db.musicalNumbers.get(numId), [numId]);

  // Notes are edited locally, then saved on blur or button press.
  // This avoids writing to IndexedDB on every keystroke.
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  // When the number loads (or changes externally), sync local notes state
  useEffect(() => {
    if (number) {
      setNotes(number.notes);
      setNotesDirty(false);
    }
  }, [number]);

  async function saveNotes() {
    if (!notesDirty) return;
    await db.musicalNumbers.update(numId, { notes });
    setNotesDirty(false);
  }

  if (number === undefined) return <div className="page"><p>Loading...</p></div>;
  if (number === null) return <div className="page"><p>Musical number not found.</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(`/show/${showId}/numbers`)}>
          ← Numbers
        </button>
      </header>

      {/* Number title with order badge */}
      <div className="detail-title-section">
        <span className="detail-order">#{number.order}</span>
        <h1 className="detail-name">{number.name}</h1>
      </div>

      {/* Notes section — the main Phase 2 feature for this page */}
      <section className="detail-section">
        <h3 className="detail-section-title">Notes</h3>
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          onBlur={saveNotes}
          placeholder="Add rehearsal notes, blocking, lyrics reminders..."
          rows={6}
        />
        {notesDirty && (
          <button className="btn btn-primary save-notes-btn" onClick={saveNotes}>
            Save Notes
          </button>
        )}
      </section>

      {/* Harmonies section — record or upload audio with measure number + caption */}
      <HarmoniesSection musicalNumberId={numId} />

      <section className="detail-section">
        <h3 className="detail-section-title">Dance Videos</h3>
        <p className="empty-state">Dance video links & uploads coming in Phase 5.</p>
      </section>
    </div>
  );
}

/**
 * HarmoniesSection is a sub-component that manages the full harmonies UI:
 * - Lists all saved harmonies for this musical number (via useLiveQuery)
 * - Each harmony renders as a HarmonyPlayer with playback + delete
 * - A toggle button shows/hides the HarmonyRecorder form for adding new ones
 *
 * It's defined here (same file) rather than in components/ because it's
 * specific to MusicalNumberDetail and not reused elsewhere.
 */
function HarmoniesSection({ musicalNumberId }: { musicalNumberId: number }) {
  const [showRecorder, setShowRecorder] = useState(false);

  // Live query — re-renders automatically whenever harmonies are added/deleted.
  // We sort by start measure number so the list reads top-to-bottom in show order.
  // The measureNumber field stores "16" or "16-18", so we parse the start number.
  const harmonies = useLiveQuery(
    () => db.harmonies.where('musicalNumberId').equals(musicalNumberId).toArray()
      .then(items => items.sort((a, b) => {
        // Parse the start measure from the stored string ("16" or "16-18")
        const startA = parseInt(a.measureNumber.split('-')[0], 10) || Infinity;
        const startB = parseInt(b.measureNumber.split('-')[0], 10) || Infinity;
        return startA - startB;
      })),
    [musicalNumberId]
  );

  async function deleteHarmony(id: number) {
    await db.harmonies.delete(id);
  }

  return (
    <section className="detail-section">
      <h3 className="detail-section-title">Harmonies</h3>

      {/* List of saved harmonies */}
      {harmonies && harmonies.length > 0 ? (
        <div className="harmony-list">
          {harmonies.map((h) => (
            <HarmonyPlayer key={h.id} harmony={h} onDelete={deleteHarmony} />
          ))}
        </div>
      ) : (
        !showRecorder && (
          <p className="empty-state empty-state-small">
            No harmonies yet. Record or upload your first one!
          </p>
        )
      )}

      {/* Add harmony form (toggled) */}
      {showRecorder ? (
        <HarmonyRecorder
          musicalNumberId={musicalNumberId}
          onDone={() => setShowRecorder(false)}
        />
      ) : (
        <button
          className="btn btn-primary add-show-btn"
          onClick={() => setShowRecorder(true)}
        >
          + Add Harmony
        </button>
      )}
    </section>
  );
}
