import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Show, type Song, type SongCategory, type SongStatus } from '../db/database';
import { base64ToBlob } from '../components/SettingsPanel';
import { importShowEntry } from '../utils/showExportImport';

/**
 * Home page with swipeable Songs / Shows views.
 *
 * The two views sit side-by-side in a horizontal container.
 * - pageIndex 0 = Songs (left), pageIndex 1 = Shows (right)
 * - Swiping left/right translates the container to reveal the other view.
 * - The nav pill colors interpolate based on swipe progress so the active
 *   pill smoothly transitions from blue→gray (and vice versa) as you drag.
 *
 * Touch handling uses three events:
 * - touchstart: record the starting X position
 * - touchmove:  calculate the delta and translate the container in real time
 * - touchend:   decide which page to snap to based on how far/fast you swiped
 */
export default function Home() {
  const navigate = useNavigate();

  // 0 = Songs, 1 = Shows
  const [pageIndex, setPageIndex] = useState(0);

  // swipeOffset is the pixel offset during an active drag (0 when idle).
  // It drives the real-time translation of the slider.
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Refs for touch tracking — we use refs (not state) because these change
  // rapidly during a drag and we don't want to trigger re-renders for each
  // touchmove event. Only swipeOffset (which drives the visual) is state.
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const isVerticalScroll = useRef(false);
  const swipeOffsetRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    isVerticalScroll.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // On first significant movement, determine if this is a horizontal swipe
    // or a vertical scroll. Once decided, stick with it for this gesture.
    if (!isDragging.current && !isVerticalScroll.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        isVerticalScroll.current = true;
        return;
      }
      if (Math.abs(dx) > 5) {
        isDragging.current = true;
      }
    }

    if (isVerticalScroll.current) return;
    if (!isDragging.current) return;

    // Clamp the offset so you can't drag past the edges (add rubber-band feel
    // by dividing excess drag by 3).
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
    const baseTranslate = -pageIndex * containerWidth;
    const rawTarget = baseTranslate + dx;

    // Boundaries: can't go further left than 0 (songs) or further right than -containerWidth (shows)
    let offset: number;
    if (rawTarget > 0) {
      offset = dx / 3; // rubber-band
    } else if (rawTarget < -containerWidth) {
      offset = dx / 3; // rubber-band
    } else {
      offset = dx;
    }
    swipeOffsetRef.current = offset;
    setSwipeOffset(offset);
  }, [pageIndex]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) {
      swipeOffsetRef.current = 0;
      setSwipeOffset(0);
      return;
    }

    // Read from ref — React 18 batches state updates, so the state value
    // captured in this closure may be stale. The ref is set synchronously
    // in onTouchMove so it always reflects the latest drag position.
    const currentOffset = swipeOffsetRef.current;
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
    const threshold = containerWidth * 0.25;

    let newIndex = pageIndex;
    if (currentOffset < -threshold && pageIndex === 0) {
      newIndex = 1; // swiped left → go to Shows
    } else if (currentOffset > threshold && pageIndex === 1) {
      newIndex = 0; // swiped right → go to Songs
    }

    setPageIndex(newIndex);
    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
    isDragging.current = false;
  }, [pageIndex]);

  // Calculate the slider translation. During a drag, add the live offset.
  // When idle (swipeOffset=0), just translate based on pageIndex.
  const containerWidth = containerRef.current?.offsetWidth || 0;
  const translateX = -pageIndex * containerWidth + swipeOffset;

  // Progress from 0 (Songs fully visible) to 1 (Shows fully visible).
  // Used to interpolate the nav pill colors.
  const progress = containerWidth > 0
    ? Math.max(0, Math.min(1, (pageIndex * containerWidth - swipeOffset) / containerWidth))
    : pageIndex;

  // Inline styles for the nav pills — blend between active/inactive colors
  // based on swipe progress so they animate in sync with the finger.
  const songsPillStyle = {
    background: `color-mix(in srgb, var(--accent) ${Math.round((1 - progress) * 100)}%, var(--surface) ${Math.round(progress * 100)}%)`,
    color: progress < 0.5 ? '#fff' : 'var(--text-secondary)',
  };

  const showsPillStyle = {
    background: `color-mix(in srgb, var(--accent) ${Math.round(progress * 100)}%, var(--surface) ${Math.round((1 - progress) * 100)}%)`,
    color: progress >= 0.5 ? '#fff' : 'var(--text-secondary)',
  };

  return (
    <div className="page home-page-content">
      <header className="page-header">
        <h1>greenroom</h1>
      </header>

      {/* Trophy icon — fixed circle next to the settings gear */}
      <button
        className="trophy-btn"
        onClick={() => navigate('/completed')}
        title="Completed Shows"
      >
        🏆
      </button>

      {/* Swipeable container — holds both views side by side */}
      <div
        className="swipe-container"
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="swipe-slider"
          style={{
            transform: `translateX(${translateX}px)`,
            // Only animate when not actively dragging (snap animation)
            transition: isDragging.current ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <div className="swipe-page">
            <SongsView />
          </div>
          <div className="swipe-page">
            <ShowsView />
          </div>
        </div>
      </div>

      {/* Bottom nav — floating pill bubbles with interpolated colors */}
      <nav className="home-bottom-nav">
        <button
          className="home-nav-item"
          style={songsPillStyle}
          onClick={() => { setPageIndex(0); setSwipeOffset(0); }}
        >
          <span className="home-nav-icon">🎵</span>
          <span className="home-nav-label">Songs</span>
        </button>
        <button
          className="home-nav-item"
          style={showsPillStyle}
          onClick={() => { setPageIndex(1); setSwipeOffset(0); }}
        >
          <span className="home-nav-icon">🎭</span>
          <span className="home-nav-label">Shows</span>
        </button>
      </nav>
    </div>
  );
}

// ==================== Shows View ====================

function ShowsView() {
  const navigate = useNavigate();
  const activeShows = useLiveQuery(
    () => db.shows.where('isCompleted').equals(0).toArray()
  );

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [rolesInput, setRolesInput] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState('');

  // Import state — tracks the duplicate modal and import progress
  const [importModal, setImportModal] = useState<{
    showData: Record<string, unknown>;
    existingId: number | null;
    existingName: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  async function createShow() {
    if (!name.trim()) return;
    const roles = rolesInput.split(',').map((r) => r.trim()).filter(Boolean);
    await db.shows.add({
      name: name.trim(),
      roles,
      isCompleted: 0,
      completedAt: null,
      createdAt: new Date(),
    });
    setName('');
    setRolesInput('');
    setShowForm(false);
  }

  function startEdit(show: Show) {
    setEditingId(show.id!);
    setEditName(show.name);
    setEditRoles(show.roles.join(', '));
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    const roles = editRoles.split(',').map((r) => r.trim()).filter(Boolean);
    await db.shows.update(editingId, { name: editName.trim(), roles });
    setEditingId(null);
  }

  async function deleteShow(id: number) {
    await db.transaction('rw', [db.shows, db.musicalNumbers, db.harmonies, db.danceVideos, db.sheetMusic, db.scenes, db.sceneRecordings], async () => {
      const numbers = await db.musicalNumbers.where('showId').equals(id).toArray();
      const numberIds = numbers.map((n) => n.id!);
      await db.harmonies.where('musicalNumberId').anyOf(numberIds).delete();
      await db.danceVideos.where('musicalNumberId').anyOf(numberIds).delete();
      await db.sheetMusic.where('musicalNumberId').anyOf(numberIds).delete();
      await db.musicalNumbers.where('showId').equals(id).delete();
      const scenes = await db.scenes.where('showId').equals(id).toArray();
      const sceneIds = scenes.map((s) => s.id!);
      await db.sceneRecordings.where('sceneId').anyOf(sceneIds).delete();
      await db.scenes.where('showId').equals(id).delete();
      await db.shows.delete(id);
    });
  }

  // ---- Import show from .grm file ----

  async function handleShowImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so the same file can be re-selected

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Support both single-show and array format (from "Export All Shows")
      const entries: Record<string, unknown>[] = Array.isArray(data) ? data : [data];

      // Filter to only show entries
      const showEntries = entries.filter(
        (entry) => entry.type === 'show' && entry.show
      );

      if (showEntries.length === 0) {
        alert('This file does not contain any shows. It may be a song export.');
        return;
      }

      // Process each show entry one at a time
      for (const entry of showEntries) {
        const entryName = (entry.show as Record<string, unknown>).name as string;
        const existing = await db.shows.where('name').equals(entryName).first();

        if (existing) {
          // Show the duplicate modal — user picks Keep Both, Replace, or Cancel.
          // We process one duplicate at a time (modal is blocking-style via state).
          setImportModal({
            showData: entry,
            existingId: existing.id!,
            existingName: existing.name,
          });
          return; // Stop here — the modal handler will finish this import
        } else {
          setImporting(true);
          await importShowEntry(entry);
          setImporting(false);
        }
      }
    } catch {
      alert('Could not read .grm file. Make sure it was exported from greenroom.');
    }
  }

  async function handleImportAction(replaceId?: number) {
    if (!importModal) return;
    setImporting(true);
    try {
      await importShowEntry(importModal.showData, replaceId);
    } catch (err) {
      console.error('Import error:', err);
      alert('Failed to import show.');
    }
    setImporting(false);
    setImportModal(null);
  }

  return (
    <>
      {/* Import button — above the show list */}
      <div className="btn-row" style={{ gap: 8, marginBottom: 12 }}>
        <label className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
          Import Show
          <input type="file" accept=".grm" onChange={handleShowImport} hidden />
        </label>
      </div>

      <div className="show-list">
        {activeShows === undefined ? (
          <p className="empty-state">Loading...</p>
        ) : activeShows.length === 0 ? (
          <p className="empty-state">No active shows yet. Create one to get started!</p>
        ) : (
          activeShows.map((show) => (
            <div key={show.id} className="show-card">
              {editingId === show.id ? (
                <div className="show-edit-form">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Show name" className="input" />
                  <input type="text" value={editRoles} onChange={(e) => setEditRoles(e.target.value)} placeholder="Roles (comma-separated)" className="input" />
                  <div className="btn-row">
                    <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="show-card-content" onClick={() => navigate(`/show/${show.id}`)}>
                  <div className="show-info">
                    <span className="show-name">{show.name}</span>
                    {show.roles.length > 0 && (
                      <span className="show-roles">{show.roles.join(', ')}</span>
                    )}
                  </div>
                  <div className="show-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn small" onClick={() => startEdit(show)} title="Edit">✏️</button>
                    <button className="icon-btn small" onClick={() => deleteShow(show.id!)} title="Delete">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showForm ? (
        <div className="new-show-form">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Show name" className="input" autoFocus />
          <input type="text" value={rolesInput} onChange={(e) => setRolesInput(e.target.value)} placeholder="Your role(s), comma-separated" className="input" />
          <div className="btn-row">
            <button className="btn btn-primary" onClick={createShow}>Create Show</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary add-show-btn" onClick={() => setShowForm(true)}>
          + New Show
        </button>
      )}

      {/* Duplicate show detection modal */}
      {importModal && (
        <div className="import-modal-backdrop" onClick={() => setImportModal(null)}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Duplicate Found</h3>
            <p>A show named "<strong>{importModal.existingName}</strong>" already exists.</p>
            <div className="btn-row">
              <button
                className="btn btn-primary"
                disabled={importing}
                onClick={() => handleImportAction()}
              >
                Keep Both
              </button>
              <button
                className="btn btn-secondary"
                disabled={importing}
                onClick={() => handleImportAction(importModal.existingId!)}
              >
                Replace
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setImportModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== Songs View ====================

/**
 * SongsView displays all standalone songs (not tied to shows).
 * Songs tagged as "Audition Song" are pinned to the top.
 * The rest are sorted alphabetically by title.
 * Includes create, edit (inline), delete, and import functionality.
 */
function SongsView() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all songs, then sort: audition songs first, then alphabetical
  const songs = useLiveQuery(
    () => db.songs.toArray().then(items =>
      items.sort((a, b) => {
        if (a.isAuditionSong && !b.isAuditionSong) return -1;
        if (!a.isAuditionSong && b.isAuditionSong) return 1;
        return a.title.localeCompare(b.title);
      })
    )
  );

  // Filter state
  const [filterCategory, setFilterCategory] = useState<'all' | 'vocal' | 'guitar'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed'>('all');

  // Apply filters, then sort: audition songs first, then alphabetical
  const filteredSongs = songs?.filter(song => {
    if (filterCategory === 'vocal' && song.category !== 'vocal') return false;
    if (filterCategory === 'guitar' && song.category !== 'guitar') return false;
    if (filterStatus !== 'all' && song.status !== filterStatus) return false;
    return true;
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [isAudition, setIsAudition] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAudition, setEditAudition] = useState(false);

  // Import state
  const [importModal, setImportModal] = useState<{
    songData: Record<string, unknown>;
    existingId: number | null;
    existingTitle: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  async function createSong() {
    if (!title.trim()) return;
    const id = await db.songs.add({
      title: title.trim(),
      isAuditionSong: isAudition,
      category: null,
      status: 'in-progress',
      notes: '',
      createdAt: new Date(),
    });
    setTitle('');
    setIsAudition(false);
    setShowForm(false);
    navigate(`/song/${id}`);
  }

  function startEdit(song: Song) {
    setEditingId(song.id!);
    setEditTitle(song.title);
    setEditAudition(song.isAuditionSong);
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim()) return;
    await db.songs.update(editingId, { title: editTitle.trim(), isAuditionSong: editAudition });
    setEditingId(null);
  }

  async function deleteSong(id: number) {
    await db.transaction('rw', [db.songs, db.songParts, db.songTracks, db.songSheetMusic], async () => {
      await db.songParts.where('songId').equals(id).delete();
      await db.songTracks.where('songId').equals(id).delete();
      await db.songSheetMusic.where('songId').equals(id).delete();
      await db.songs.delete(id);
    });
  }

  // ---- Import song from .grm file ----

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Support both single-song and array format
      const songEntries = Array.isArray(data) ? data : [data];

      for (const entry of songEntries) {
        if (entry.type !== 'song' || !entry.song) continue;

        // Check for duplicate by title
        const existing = await db.songs.where('title').equals(entry.song.title).first();
        if (existing) {
          setImportModal({
            songData: entry,
            existingId: existing.id!,
            existingTitle: existing.title,
          });
        } else {
          await importSongEntry(entry);
        }
      }
    } catch {
      alert('Could not read .grm file. Make sure it was exported from greenroom.');
    }
  }

  async function importSongEntry(entry: Record<string, unknown>, replaceId?: number) {
    setImporting(true);
    try {
      await db.transaction('rw', [db.songs, db.songParts, db.songTracks, db.songSheetMusic], async () => {
        // If replacing, delete the old song first
        if (replaceId) {
          await db.songParts.where('songId').equals(replaceId).delete();
          await db.songTracks.where('songId').equals(replaceId).delete();
          await db.songSheetMusic.where('songId').equals(replaceId).delete();
          await db.songs.delete(replaceId);
        }

        const songData = entry.song as Record<string, unknown>;
        const songId = await db.songs.add({
          title: songData.title as string,
          isAuditionSong: songData.isAuditionSong as boolean,
          category: (songData.category as SongCategory) ?? null,
          status: (songData.status as SongStatus) ?? 'in-progress',
          notes: songData.notes as string,
          createdAt: new Date(songData.createdAt as string),
        });

        // Import parts
        const parts = (entry.parts || []) as Record<string, unknown>[];
        for (const p of parts) {
          await db.songParts.add({
            songId,
            audioBlob: base64ToBlob(p.audioBlob as string),
            measureNumber: p.measureNumber as string,
            caption: p.caption as string,
            createdAt: new Date(p.createdAt as string),
          });
        }

        // Import tracks
        const tracks = (entry.tracks || []) as Record<string, unknown>[];
        for (const t of tracks) {
          await db.songTracks.add({
            songId,
            type: t.type as 'link' | 'audio' | 'video',
            url: t.url as string | null,
            blob: t.blob ? base64ToBlob(t.blob as string) : null,
            title: t.title as string,
            createdAt: new Date(t.createdAt as string),
          });
        }

        // Import sheet music
        const sheets = (entry.sheetMusic || []) as Record<string, unknown>[];
        for (const s of sheets) {
          await db.songSheetMusic.add({
            songId,
            pdfBlob: base64ToBlob(s.pdfBlob as string),
            title: s.title as string,
            createdAt: new Date(s.createdAt as string),
          });
        }
      });
    } catch (err) {
      console.error('Import error:', err);
      alert('Failed to import song.');
    }
    setImporting(false);
    setImportModal(null);
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(date));
  }

  // Returns the CSS class suffix for the category left-border color
  function categoryClass(cat: SongCategory): string {
    if (cat === 'vocal') return 'song-cat-vocal';
    if (cat === 'guitar') return 'song-cat-guitar';
    return '';
  }

  return (
    <>
      {/* Filter bar */}
      <div className="song-filters">
        <div className="song-filter-group">
          <button className={`song-filter-pill ${filterCategory === 'all' ? 'active' : ''}`} onClick={() => setFilterCategory('all')}>All</button>
          <button className={`song-filter-pill song-filter-vocal ${filterCategory === 'vocal' ? 'active' : ''}`} onClick={() => setFilterCategory('vocal')}>Vocal</button>
          <button className={`song-filter-pill song-filter-guitar ${filterCategory === 'guitar' ? 'active' : ''}`} onClick={() => setFilterCategory('guitar')}>Guitar</button>
        </div>
        <div className="song-filter-group">
          <button className={`song-filter-pill ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
          <button className={`song-filter-pill ${filterStatus === 'in-progress' ? 'active' : ''}`} onClick={() => setFilterStatus('in-progress')}>In Progress</button>
          <button className={`song-filter-pill ${filterStatus === 'completed' ? 'active' : ''}`} onClick={() => setFilterStatus('completed')}>Completed</button>
        </div>
      </div>

      {/* Import button — below filters, above list */}
      <div className="btn-row" style={{ gap: 8, marginBottom: 12 }}>
        <label className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
          Import Song
          <input
            ref={fileInputRef}
            type="file"
            accept=".grm"
            onChange={handleImportFile}
            hidden
          />
        </label>
      </div>

      <div className="song-list">
        {filteredSongs === undefined ? (
          <p className="empty-state">Loading...</p>
        ) : filteredSongs.length === 0 ? (
          songs && songs.length > 0
            ? <p className="empty-state">No songs match these filters.</p>
            : <p className="empty-state">No songs yet. Add one to get started!</p>
        ) : (
          filteredSongs.map((song) => (
            <div key={song.id} className={`song-card ${categoryClass(song.category)}`}>
              {editingId === song.id ? (
                <div className="song-edit-form">
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Song title" className="input" />
                  <label className="checkbox-label">
                    <input type="checkbox" checked={editAudition} onChange={(e) => setEditAudition(e.target.checked)} />
                    Audition Song
                  </label>
                  <div className="btn-row">
                    <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="song-card-content" onClick={() => navigate(`/song/${song.id}`)}>
                  <div className="song-info">
                    <div className="song-title-row">
                      <span className="song-title">{song.title}</span>
                      {/* Status indicator: checkmark for completed, pulsing dot for in-progress */}
                      {song.status === 'completed' ? (
                        <span className="song-status-check" title="Completed">&#10003;</span>
                      ) : (
                        <span className="song-status-dot" title="In Progress" />
                      )}
                    </div>
                    <div className="song-meta-row">
                      {song.isAuditionSong && <span className="audition-badge">Audition</span>}
                      {song.category && (
                        <span className={`song-category-badge song-category-${song.category}`}>
                          {song.category.charAt(0).toUpperCase() + song.category.slice(1)}
                        </span>
                      )}
                      <span className="song-date">{formatDate(song.createdAt)}</span>
                    </div>
                  </div>
                  <div className="song-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn small" onClick={() => startEdit(song)} title="Edit">✏️</button>
                    <button className="icon-btn small" onClick={() => deleteSong(song.id!)} title="Delete">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showForm ? (
        <div className="new-show-form">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title" className="input" autoFocus />
          <label className="checkbox-label">
            <input type="checkbox" checked={isAudition} onChange={(e) => setIsAudition(e.target.checked)} />
            Audition Song
          </label>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={createSong}>Create Song</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary add-show-btn" onClick={() => setShowForm(true)}>
          + New Song
        </button>
      )}

      {/* Duplicate detection modal */}
      {importModal && (
        <div className="import-modal-backdrop" onClick={() => setImportModal(null)}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Duplicate Found</h3>
            <p>A song named "<strong>{importModal.existingTitle}</strong>" already exists.</p>
            <div className="btn-row">
              <button
                className="btn btn-primary"
                disabled={importing}
                onClick={() => importSongEntry(importModal.songData)}
              >
                Keep Both
              </button>
              <button
                className="btn btn-secondary"
                disabled={importing}
                onClick={() => importSongEntry(importModal.songData, importModal.existingId!)}
              >
                Replace
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setImportModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
