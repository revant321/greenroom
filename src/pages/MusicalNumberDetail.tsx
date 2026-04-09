import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import HarmonyRecorder from '../components/HarmonyRecorder';
import HarmonyPlayer from '../components/HarmonyPlayer';
import DanceVideoRecorder from '../components/DanceVideoRecorder';
import DanceVideoPlayer from '../components/DanceVideoPlayer';

export default function MusicalNumberDetail() {
  const { showId, numberId } = useParams<{ showId: string; numberId: string }>();
  const navigate = useNavigate();
  const numId = Number(numberId);

  const number = useLiveQuery(() => db.musicalNumbers.get(numId), [numId]);

  // Notes — smart-save on blur
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

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

      <div className="detail-title-section">
        <span className="detail-order">#{number.order}</span>
        <h1 className="detail-name">{number.name}</h1>
      </div>

      {/* Notes */}
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

      {/* Harmonies */}
      <HarmoniesSection musicalNumberId={numId} />

      {/* Dance Videos */}
      <DanceVideosSection musicalNumberId={numId} />

      {/* Sheet Music */}
      <SheetMusicSection musicalNumberId={numId} />
    </div>
  );
}

// ---------- Harmonies ----------

function HarmoniesSection({ musicalNumberId }: { musicalNumberId: number }) {
  const [showRecorder, setShowRecorder] = useState(false);

  const harmonies = useLiveQuery(
    () => db.harmonies.where('musicalNumberId').equals(musicalNumberId).toArray()
      .then(items => items.sort((a, b) => {
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

// ---------- Dance Videos ----------

/**
 * DanceVideosSection lists all dance videos for a musical number and provides
 * a toggle to show the DanceVideoRecorder form for adding new ones.
 * Each video can be an external link or an uploaded/recorded file.
 */
function DanceVideosSection({ musicalNumberId }: { musicalNumberId: number }) {
  const [showForm, setShowForm] = useState(false);

  const videos = useLiveQuery(
    () => db.danceVideos.where('musicalNumberId').equals(musicalNumberId).toArray(),
    [musicalNumberId]
  );

  async function deleteVideo(id: number) {
    await db.danceVideos.delete(id);
  }

  return (
    <section className="detail-section">
      <h3 className="detail-section-title">Dance Videos</h3>

      {videos && videos.length > 0 ? (
        <div className="dance-video-list">
          {videos.map((v) => (
            <DanceVideoPlayer key={v.id} video={v} onDelete={deleteVideo} />
          ))}
        </div>
      ) : (
        !showForm && (
          <p className="empty-state empty-state-small">
            No dance videos yet. Add a link or upload one!
          </p>
        )
      )}

      {showForm ? (
        <DanceVideoRecorder
          musicalNumberId={musicalNumberId}
          onDone={() => setShowForm(false)}
        />
      ) : (
        <button
          className="btn btn-primary add-show-btn"
          onClick={() => setShowForm(true)}
        >
          + Add Dance Video
        </button>
      )}
    </section>
  );
}

// ---------- Sheet Music ----------

/**
 * SheetMusicSection lets users upload PDFs for a musical number.
 * Tapping a sheet music card opens the PDF in a new browser tab via
 * URL.createObjectURL — no server needed, works fully offline.
 */
function SheetMusicSection({ musicalNumberId }: { musicalNumberId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const sheets = useLiveQuery(
    () => db.sheetMusic.where('musicalNumberId').equals(musicalNumberId).toArray(),
    [musicalNumberId]
  );

  function openPdf(blob: Blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  async function deleteSheet(id: number) {
    await db.sheetMusic.delete(id);
  }

  async function save() {
    if (!pdfFile) return;
    await db.sheetMusic.add({
      musicalNumberId,
      pdfBlob: pdfFile,
      title: title.trim() || pdfFile.name,
      createdAt: new Date(),
    });
    setTitle('');
    setPdfFile(null);
    setShowForm(false);
  }

  return (
    <section className="detail-section">
      <h3 className="detail-section-title">Sheet Music</h3>

      {sheets && sheets.length > 0 ? (
        <div className="sheet-music-list">
          {sheets.map((s) => (
            <div
              key={s.id}
              className="sheet-music-card"
              onClick={() => openPdf(s.pdfBlob)}
            >
              <span className="sheet-music-title">
                <span className="sheet-music-badge">📄</span>
                {s.title}
              </span>
              <button
                className="icon-btn small"
                onClick={(e) => { e.stopPropagation(); deleteSheet(s.id!); }}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <p className="empty-state empty-state-small">
            No sheet music yet. Upload a PDF!
          </p>
        )
      )}

      {showForm ? (
        <div className="dance-video-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. 'Vocal Score')"
            className="input"
          />
          <label className="btn btn-secondary upload-label">
            {pdfFile ? `✓ ${pdfFile.name}` : '📁 Choose PDF'}
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              hidden
            />
          </label>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={save} disabled={!pdfFile}>
              Save Sheet Music
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setPdfFile(null); setTitle(''); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary add-show-btn"
          onClick={() => setShowForm(true)}
        >
          + Add Sheet Music
        </button>
      )}
    </section>
  );
}
