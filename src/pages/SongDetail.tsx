import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SongPart, type SongTrack, type SongCategory } from '../db/database';
import AudioWaveform from '../components/AudioWaveform';
import { blobToBase64, downloadBlob } from '../components/SettingsPanel';

/**
 * SongDetail is the detail page for a standalone song (not tied to a show).
 * It has four sections:
 *
 * 1. **Sheet Music** — upload PDFs, tap to open in new tab
 * 2. **Tracks** — links, audio, or video (upload or record)
 * 3. **Parts** — labeled audio with measure numbers, captions, and waveform
 *    (reuses the same pattern as HarmonyRecorder)
 * 4. **Notes** — free-text with smart-save on blur
 *
 * Also includes an export button and audition song toggle.
 */
export default function SongDetail() {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const id = Number(songId);

  const song = useLiveQuery(() => db.songs.get(id), [id]);

  // Notes — smart-save on blur
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  useEffect(() => {
    if (song) {
      setNotes(song.notes);
      setNotesDirty(false);
    }
  }, [song]);

  async function saveNotes() {
    if (!notesDirty) return;
    await db.songs.update(id, { notes });
    setNotesDirty(false);
  }

  async function toggleAudition() {
    if (!song) return;
    await db.songs.update(id, { isAuditionSong: !song.isAuditionSong });
  }

  async function setCategory(cat: SongCategory) {
    await db.songs.update(id, { category: cat });
  }

  async function toggleStatus() {
    if (!song) return;
    const newStatus = song.status === 'completed' ? 'in-progress' : 'completed';
    await db.songs.update(id, { status: newStatus });
  }

  async function exportSong() {
    if (!song) return;
    const parts = await db.songParts.where('songId').equals(id).toArray();
    const tracks = await db.songTracks.where('songId').equals(id).toArray();
    const sheets = await db.songSheetMusic.where('songId').equals(id).toArray();

    const exportData = {
      type: 'song',
      song: { ...song, id: undefined },
      parts: await Promise.all(parts.map(async (p) => ({
        audioBlob: await blobToBase64(p.audioBlob),
        measureNumber: p.measureNumber,
        caption: p.caption,
        createdAt: p.createdAt,
      }))),
      tracks: await Promise.all(tracks.map(async (t) => ({
        type: t.type,
        url: t.url,
        blob: t.blob ? await blobToBase64(t.blob) : null,
        title: t.title,
        createdAt: t.createdAt,
      }))),
      sheetMusic: await Promise.all(sheets.map(async (s) => ({
        pdfBlob: await blobToBase64(s.pdfBlob),
        title: s.title,
        createdAt: s.createdAt,
      }))),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/octet-stream' });
    const safeName = song.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-');
    downloadBlob(blob, `${safeName}-song.grm`);
  }

  if (song === undefined) return <div className="page"><p>Loading...</p></div>;
  if (song === null) return <div className="page"><p>Song not found.</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Songs
        </button>
      </header>

      <div className="song-detail-header">
        <h1 className="song-detail-title">{song.title}</h1>
        {song.isAuditionSong && <span className="audition-badge">Audition Song</span>}

        {/* Category selector — three pill buttons */}
        <div className="song-detail-controls">
          <label className="song-detail-control-label">Category</label>
          <div className="song-detail-pill-row">
            <button
              className={`song-filter-pill ${song.category === null ? 'active' : ''}`}
              onClick={() => setCategory(null)}
            >
              None
            </button>
            <button
              className={`song-filter-pill song-filter-vocal ${song.category === 'vocal' ? 'active' : ''}`}
              onClick={() => setCategory('vocal')}
            >
              Vocal
            </button>
            <button
              className={`song-filter-pill song-filter-guitar ${song.category === 'guitar' ? 'active' : ''}`}
              onClick={() => setCategory('guitar')}
            >
              Guitar
            </button>
          </div>
        </div>

        {/* Status toggle — tap to switch between In Progress and Completed */}
        <div className="song-detail-controls">
          <label className="song-detail-control-label">Status</label>
          <button className={`song-status-toggle ${song.status === 'completed' ? 'status-completed' : 'status-in-progress'}`} onClick={toggleStatus}>
            {song.status === 'completed' ? '✓ Completed' : '◐ In Progress'}
          </button>
        </div>

        <div style={{ marginTop: 4 }}>
          <button className="btn-link audition-toggle" onClick={toggleAudition}>
            {song.isAuditionSong ? 'Remove Audition Tag' : 'Mark as Audition Song'}
          </button>
        </div>
      </div>

      {/* Sheet Music */}
      <SongSheetMusicSection songId={id} />

      {/* Tracks */}
      <SongTracksSection songId={id} />

      {/* Parts (like harmonies — audio with measure numbers) */}
      <SongPartsSection songId={id} />

      {/* Notes */}
      <section className="detail-section">
        <h3 className="detail-section-title">Notes</h3>
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
          onBlur={saveNotes}
          placeholder="Lyrics, performance notes, vocal tips..."
          rows={6}
        />
        {notesDirty && (
          <button className="btn btn-primary save-notes-btn" onClick={saveNotes}>
            Save Notes
          </button>
        )}
      </section>

      {/* Export */}
      <button className="btn btn-secondary song-export-btn" onClick={exportSong}>
        Export Song (.grm)
      </button>
    </div>
  );
}

// ---------- Song Sheet Music ----------

function SongSheetMusicSection({ songId }: { songId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const sheets = useLiveQuery(
    () => db.songSheetMusic.where('songId').equals(songId).toArray(),
    [songId]
  );

  function openPdf(blob: Blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  async function deleteSheet(id: number) {
    await db.songSheetMusic.delete(id);
  }

  async function save() {
    if (!pdfFile) return;
    await db.songSheetMusic.add({
      songId,
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
            <div key={s.id} className="sheet-music-card" onClick={() => openPdf(s.pdfBlob)}>
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
        !showForm && <p className="empty-state empty-state-small">No sheet music yet.</p>
      )}

      {showForm ? (
        <div className="dance-video-form">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input" />
          <label className="btn btn-secondary upload-label">
            {pdfFile ? `✓ ${pdfFile.name}` : '📁 Choose PDF'}
            <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} hidden />
          </label>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={save} disabled={!pdfFile}>Save</button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setPdfFile(null); setTitle(''); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary add-show-btn" onClick={() => setShowForm(true)}>+ Add Sheet Music</button>
      )}
    </section>
  );
}

// ---------- Song Tracks ----------

/**
 * Tracks can be links (URLs), audio files, or video files.
 * Similar to dance videos but with the addition of audio type.
 */
function SongTracksSection({ songId }: { songId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [trackType, setTrackType] = useState<'link' | 'audio' | 'video'>('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const tracks = useLiveQuery(
    () => db.songTracks.where('songId').equals(songId).toArray(),
    [songId]
  );

  async function deleteTrack(id: number) {
    await db.songTracks.delete(id);
  }

  async function startRecording() {
    setRecordingError('');
    try {
      const constraints = trackType === 'audio'
        ? { audio: true }
        : { audio: true, video: { facingMode: 'environment' } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLiveStream(stream);

      const mimeType = trackType === 'audio'
        ? (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '')
        : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setMediaBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        setLiveStream(null);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setRecordingError(`Could not access ${trackType === 'audio' ? 'microphone' : 'camera'}.`);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  function clearMedia() {
    setMediaBlob(null);
    chunksRef.current = [];
    if (liveStream) { liveStream.getTracks().forEach((t) => t.stop()); setLiveStream(null); }
  }

  function resetForm() {
    setShowForm(false);
    setTitle('');
    setUrl('');
    clearMedia();
    setTrackType('link');
  }

  async function save() {
    if (trackType === 'link') {
      if (!url.trim()) return;
      await db.songTracks.add({
        songId, type: 'link', url: url.trim(), blob: null,
        title: title.trim() || url.trim(), createdAt: new Date(),
      });
    } else {
      if (!mediaBlob) return;
      await db.songTracks.add({
        songId, type: trackType, url: null, blob: mediaBlob,
        title: title.trim() || `Untitled ${trackType}`, createdAt: new Date(),
      });
    }
    resetForm();
  }

  const canSave = trackType === 'link' ? url.trim().length > 0 : mediaBlob !== null;

  return (
    <section className="detail-section">
      <h3 className="detail-section-title">Tracks</h3>

      {tracks && tracks.length > 0 ? (
        <div className="track-list">
          {tracks.map((t) => (
            <TrackPlayer key={t.id} track={t} onDelete={deleteTrack} />
          ))}
        </div>
      ) : (
        !showForm && <p className="empty-state empty-state-small">No tracks yet.</p>
      )}

      {showForm ? (
        <div className="track-form">
          <div className="media-type-toggle">
            <button className={`btn ${trackType === 'link' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setTrackType('link'); clearMedia(); }}>Link</button>
            <button className={`btn ${trackType === 'audio' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setTrackType('audio'); setUrl(''); clearMedia(); }}>Audio</button>
            <button className={`btn ${trackType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setTrackType('video'); setUrl(''); clearMedia(); }}>Video</button>
          </div>

          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Title" className="input" />

          {trackType === 'link' ? (
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..." className="input" />
          ) : mediaBlob ? (
            <div className="media-preview">
              {trackType === 'audio' ? (
                <audio controls src={URL.createObjectURL(mediaBlob)} />
              ) : (
                <video controls src={URL.createObjectURL(mediaBlob)} className="video-preview" />
              )}
              <button className="btn-link" onClick={clearMedia}>Remove & re-record</button>
            </div>
          ) : (
            <div className="audio-input-methods">
              {isRecording ? (
                <button className="btn btn-danger" onClick={stopRecording}>⏹ Stop</button>
              ) : (
                <button className="btn btn-secondary" onClick={startRecording}>
                  {trackType === 'audio' ? '🎙 Record' : '📹 Record'}
                </button>
              )}
              <span className="audio-input-or">or</span>
              <label className="btn btn-secondary upload-label">
                📁 Upload
                <input type="file" accept={trackType === 'audio' ? 'audio/*' : 'video/*'}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setMediaBlob(f); }} hidden />
              </label>
            </div>
          )}

          {isRecording && trackType === 'audio' && (
            <AudioWaveform stream={liveStream} isRecording={isRecording} />
          )}

          {recordingError && <p className="error-text">{recordingError}</p>}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={save} disabled={!canSave}>Save Track</button>
            <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary add-show-btn" onClick={() => setShowForm(true)}>+ Add Track</button>
      )}
    </section>
  );
}

// ---------- Track Player ----------

function TrackPlayer({ track, onDelete }: { track: SongTrack; onDelete: (id: number) => void }) {
  const mediaUrl = useMemo(
    () => track.blob ? URL.createObjectURL(track.blob) : null,
    [track.blob]
  );

  return (
    <div className="track-card">
      <span className="track-title">{track.title || 'Untitled'}</span>

      {track.type === 'link' ? (
        <a href={track.url!} target="_blank" rel="noopener noreferrer" className="track-link">
          {track.url}
        </a>
      ) : track.type === 'audio' ? (
        <audio controls src={mediaUrl!} className="recording-audio" />
      ) : (
        <video controls src={mediaUrl!} className="recording-video" />
      )}

      <button className="icon-btn small track-delete" onClick={() => onDelete(track.id!)} title="Delete">
        🗑️
      </button>
    </div>
  );
}

// ---------- Song Parts (like Harmonies) ----------

/**
 * Parts are labeled audio clips with measure numbers and captions,
 * identical in structure to harmonies. They include the real-time
 * waveform visualizer during recording.
 */
function SongPartsSection({ songId }: { songId: number }) {
  const [showRecorder, setShowRecorder] = useState(false);

  const parts = useLiveQuery(
    () => db.songParts.where('songId').equals(songId).toArray()
      .then(items => items.sort((a, b) => {
        const startA = parseInt(a.measureNumber.split('-')[0], 10) || Infinity;
        const startB = parseInt(b.measureNumber.split('-')[0], 10) || Infinity;
        return startA - startB;
      })),
    [songId]
  );

  async function deletePart(id: number) {
    await db.songParts.delete(id);
  }

  return (
    <section className="detail-section">
      <h3 className="detail-section-title">Parts</h3>

      {parts && parts.length > 0 ? (
        <div className="harmony-list">
          {parts.map((p) => (
            <SongPartPlayer key={p.id} part={p} onDelete={deletePart} />
          ))}
        </div>
      ) : (
        !showRecorder && <p className="empty-state empty-state-small">No parts yet.</p>
      )}

      {showRecorder ? (
        <SongPartRecorder songId={songId} onDone={() => setShowRecorder(false)} />
      ) : (
        <button className="btn btn-primary add-show-btn" onClick={() => setShowRecorder(true)}>
          + Add Part
        </button>
      )}
    </section>
  );
}

// ---------- Song Part Player ----------

function SongPartPlayer({ part, onDelete }: { part: SongPart; onDelete: (id: number) => void }) {
  const audioUrl = useMemo(() => URL.createObjectURL(part.audioBlob), [part.audioBlob]);

  return (
    <div className="harmony-card">
      <div className="harmony-meta">
        {part.measureNumber && (
          <span className="harmony-measure">
            {part.measureNumber.includes('-') ? `mm. ${part.measureNumber}` : `m. ${part.measureNumber}`}
          </span>
        )}
        {part.caption && <span className="harmony-caption">{part.caption}</span>}
      </div>
      <audio controls src={audioUrl} className="harmony-audio" />
      <button className="icon-btn small harmony-delete" onClick={() => onDelete(part.id!)} title="Delete">🗑️</button>
    </div>
  );
}

// ---------- Song Part Recorder ----------

/**
 * Reuses the same pattern as HarmonyRecorder: start/end measure inputs,
 * caption, record or upload audio, real-time waveform during recording.
 */
function SongPartRecorder({ songId, onDone }: { songId: number; onDone: () => void }) {
  const [startMeasure, setStartMeasure] = useState('');
  const [endMeasure, setEndMeasure] = useState('');
  const [measureError, setMeasureError] = useState('');
  const [caption, setCaption] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setRecordingError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLiveStream(stream);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType }));
        stream.getTracks().forEach((t) => t.stop());
        setLiveStream(null);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setRecordingError('Could not access microphone.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAudioBlob(file);
  }

  function validateMeasures(): boolean {
    const start = startMeasure.trim();
    const end = endMeasure.trim();
    if (!start && !end) { setMeasureError(''); return true; }
    if (!start || !end) { setMeasureError('Enter both start and end measure, or leave both empty.'); return false; }
    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);
    if (isNaN(startNum) || startNum < 1) { setMeasureError('Start measure must be a positive number.'); return false; }
    if (isNaN(endNum) || endNum < 1) { setMeasureError('End measure must be a positive number.'); return false; }
    if (endNum < startNum) { setMeasureError('End measure cannot be before start measure.'); return false; }
    setMeasureError('');
    return true;
  }

  async function save() {
    if (!audioBlob) return;
    if (!validateMeasures()) return;
    const start = startMeasure.trim();
    const end = endMeasure.trim();
    await db.songParts.add({
      songId,
      audioBlob,
      measureNumber: start ? (start === end ? start : `${start}-${end}`) : '',
      caption: caption.trim(),
      createdAt: new Date(),
    });
    onDone();
  }

  return (
    <div className="harmony-recorder">
      <div className="measure-row">
        <input type="number" inputMode="numeric" value={startMeasure}
          onChange={(e) => { setStartMeasure(e.target.value); setMeasureError(''); }}
          placeholder="Start m." className="measure-input" min={1} />
        <span className="measure-dash">–</span>
        <input type="number" inputMode="numeric" value={endMeasure}
          onChange={(e) => { setEndMeasure(e.target.value); setMeasureError(''); }}
          placeholder="End m." className="measure-input" min={1} />
      </div>
      {measureError && <p className="measure-error">{measureError}</p>}

      <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (e.g. 'Soprano line, verse 2')" className="input" />

      {audioBlob ? (
        <div className="audio-preview">
          <audio controls src={URL.createObjectURL(audioBlob)} />
          <button className="btn-link" onClick={() => { setAudioBlob(null); chunksRef.current = []; }}>
            Remove & re-record
          </button>
        </div>
      ) : (
        <div className="audio-input-methods">
          {isRecording ? (
            <button className="btn btn-danger" onClick={stopRecording}>⏹ Stop Recording</button>
          ) : (
            <button className="btn btn-secondary" onClick={startRecording}>🎙 Record</button>
          )}
          <span className="audio-input-or">or</span>
          <label className="btn btn-secondary upload-label">
            📁 Upload File
            <input type="file" accept="audio/*" onChange={handleFileUpload} hidden />
          </label>
        </div>
      )}

      {isRecording && <AudioWaveform stream={liveStream} isRecording={isRecording} />}
      {recordingError && <p className="error-text">{recordingError}</p>}

      <div className="btn-row">
        <button className="btn btn-primary" onClick={save} disabled={!audioBlob}>Save Part</button>
        <button className="btn btn-secondary" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}
