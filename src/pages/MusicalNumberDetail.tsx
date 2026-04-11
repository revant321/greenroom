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
 * SheetMusicSection lets users add sheet music as either a PDF upload or a link.
 * Uses the same link/file toggle pattern as DanceVideoRecorder.
 * PDFs open via URL.createObjectURL; links open in a new browser tab.
 */
function SheetMusicSection({ musicalNumberId }: { musicalNumberId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [inputType, setInputType] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const sheets = useLiveQuery(
    () => db.sheetMusic.where('musicalNumberId').equals(musicalNumberId).toArray(),
    [musicalNumberId]
  );

  function openSheet(s: { type: 'file' | 'link'; pdfBlob: Blob | null; url: string | null }) {
    if (s.type === 'link' && s.url) {
      window.open(s.url, '_blank');
    } else if (s.pdfBlob) {
      window.open(URL.createObjectURL(s.pdfBlob), '_blank');
    }
  }

  async function deleteSheet(id: number) {
    await db.sheetMusic.delete(id);
  }

  function resetForm() {
    setShowForm(false);
    setInputType('file');
    setTitle('');
    setUrl('');
    setPdfFile(null);
  }

  async function save() {
    if (inputType === 'link') {
      if (!url.trim()) return;
      await db.sheetMusic.add({
        musicalNumberId,
        type: 'link',
        pdfBlob: null,
        url: url.trim(),
        title: title.trim() || url.trim(),
        createdAt: new Date(),
      });
    } else {
      if (!pdfFile) return;
      await db.sheetMusic.add({
        musicalNumberId,
        type: 'file',
        pdfBlob: pdfFile,
        url: null,
        title: title.trim() || pdfFile.name,
        createdAt: new Date(),
      });
    }
    resetForm();
  }

  const canSave = inputType === 'link' ? url.trim().length > 0 : pdfFile !== null;

  return (
    <section className="detail-section">
      <h3 className="detail-section-title">Sheet Music</h3>

      {sheets && sheets.length > 0 ? (
        <div className="sheet-music-list">
          {sheets.map((s) => (
            <div
              key={s.id}
              className="sheet-music-card"
              onClick={() => openSheet(s)}
            >
              <span className="sheet-music-title">
                <span className="sheet-music-badge">{s.type === 'link' ? '🔗' : '📄'}</span>
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
            No sheet music yet. Upload a PDF or add a link!
          </p>
        )
      )}

      {showForm ? (
        <div className="dance-video-form">
          {/* Toggle between link and file — same pattern as dance videos */}
          <div className="media-type-toggle">
            <button
              className={`btn ${inputType === 'file' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setInputType('file'); setUrl(''); }}
            >
              Upload PDF
            </button>
            <button
              className={`btn ${inputType === 'link' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setInputType('link'); setPdfFile(null); }}
            >
              Link
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. 'Vocal Score')"
            className="input"
          />

          {inputType === 'link' ? (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="input"
            />
          ) : (
            <label className="btn btn-secondary upload-label">
              {pdfFile ? `✓ ${pdfFile.name}` : '📁 Choose PDF'}
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                hidden
              />
            </label>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={save} disabled={!canSave}>
              Save Sheet Music
            </button>
            <button className="btn btn-secondary" onClick={resetForm}>
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
