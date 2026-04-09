import { useState } from 'react';
import { db } from '../db/database';
import { exportShowData } from '../utils/showExportImport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * SettingsPanel slides in from the right when the gear icon is tapped.
 * Currently holds "Export All Songs" — designed to be expanded later.
 *
 * The backdrop + panel use CSS transitions for smooth open/close.
 * We render the panel always but translate it off-screen when closed,
 * so the transition animates both ways (not just on mount).
 */
export default function SettingsPanel({ isOpen, onClose }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [exportingShows, setExportingShows] = useState(false);
  const [exportShowsMsg, setExportShowsMsg] = useState('');

  function handleClose() {
    onClose();
    // Reset help view after the close animation finishes
    setTimeout(() => setShowHelp(false), 450);
  }

  async function exportAllSongs() {
    setExporting(true);
    setExportMsg('');
    try {
      const songs = await db.songs.toArray();
      if (songs.length === 0) {
        setExportMsg('No songs to export.');
        setExporting(false);
        return;
      }

      const exportData: Record<string, unknown>[] = [];

      for (const song of songs) {
        const parts = await db.songParts.where('songId').equals(song.id!).toArray();
        const tracks = await db.songTracks.where('songId').equals(song.id!).toArray();
        const sheets = await db.songSheetMusic.where('songId').equals(song.id!).toArray();

        exportData.push({
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
            blobType: t.blob?.type || null,
            title: t.title,
            createdAt: t.createdAt,
          }))),
          sheetMusic: await Promise.all(sheets.map(async (s) => ({
            pdfBlob: await blobToBase64(s.pdfBlob),
            title: s.title,
            createdAt: s.createdAt,
          }))),
        });
      }

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/octet-stream' });
      downloadBlob(blob, `greenroom-all-songs-${Date.now()}.grm`);
      setExportMsg(`Exported ${songs.length} song(s).`);
    } catch (err) {
      setExportMsg('Export failed. Please try again.');
      console.error(err);
    }
    setExporting(false);
  }

  async function exportAllShows() {
    setExportingShows(true);
    setExportShowsMsg('');
    try {
      // Fetch ALL shows (both active and completed)
      const shows = await db.shows.toArray();
      if (shows.length === 0) {
        setExportShowsMsg('No shows to export.');
        setExportingShows(false);
        return;
      }

      // Export each show using the shared utility
      const exportData: Record<string, unknown>[] = [];
      for (const show of shows) {
        const data = await exportShowData(show.id!);
        exportData.push(data);
      }

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/octet-stream' });
      downloadBlob(blob, `greenroom-all-shows-${Date.now()}.grm`);
      setExportShowsMsg(`Exported ${shows.length} show(s).`);
    } catch (err) {
      setExportShowsMsg('Export failed. Please try again.');
      console.error(err);
    }
    setExportingShows(false);
  }

  return (
    <>
      {/* Backdrop — clicking it closes the panel */}
      <div
        className={`settings-backdrop ${isOpen ? 'settings-backdrop-open' : ''}`}
        onClick={handleClose}
      />

      {/* Full-screen modal */}
      <div className={`settings-panel ${isOpen ? 'settings-panel-open' : ''}`}>
        {/* Sliding inner wrapper — translateX to switch between settings and help */}
        <div className={`settings-slider ${showHelp ? 'settings-slider-help' : ''}`}>

          {/* ===== Settings View ===== */}
          <div className="settings-view">
            <div className="settings-header">
              <h2>Settings</h2>
              <button className="icon-btn" onClick={handleClose} title="Close">✕</button>
            </div>

            <div className="settings-content">
              <button
                className="btn btn-secondary settings-action-btn"
                onClick={exportAllSongs}
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : 'Export All Songs'}
              </button>
              {exportMsg && <p className="settings-msg">{exportMsg}</p>}

              <button
                className="btn btn-secondary settings-action-btn"
                onClick={exportAllShows}
                disabled={exportingShows}
              >
                {exportingShows ? 'Exporting...' : 'Export All Shows'}
              </button>
              {exportShowsMsg && <p className="settings-msg">{exportShowsMsg}</p>}

              <div className="settings-divider" />

              <button
                className="btn btn-secondary settings-action-btn"
                onClick={() => setShowHelp(true)}
              >
                How to Use greenroom
              </button>
            </div>
          </div>

          {/* ===== Help View ===== */}
          <div className="settings-view">
            <div className="settings-header">
              <button className="back-btn" onClick={() => setShowHelp(false)}>
                ‹ Settings
              </button>
              <button className="icon-btn" onClick={handleClose} title="Close">✕</button>
            </div>

            <div className="help-content">
              <h1 className="help-hero">Welcome to greenroom!</h1>
              <p className="help-subtitle">Your personal backstage companion for theater.</p>

              {/* ---- What is greenroom ---- */}
              <div className="help-section">
                <h3 className="help-section-title">What is greenroom?</h3>
                <div className="help-card">
                  <p>greenroom is a personal theater organizer for managing your shows, songs, harmonies, scenes, dance videos, and rehearsal notes — all in one place, all on your device.</p>
                </div>
              </div>

              {/* ---- Getting Started ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Getting Started</h3>
                <div className="help-card">
                  <p><strong>Create a show</strong> — Tap "+ New Show" on the Shows tab. Enter the show name and your role(s), separated by commas.</p>
                  <div className="help-card-sep" />
                  <p><strong>Add musical numbers</strong> — Open a show, tap "Musical Numbers," then add each number with its name and order in the show.</p>
                  <div className="help-card-sep" />
                  <p><strong>Add scenes</strong> — Open a show, tap "Scenes," then add each scene. Toggle "I'm in this scene" for the ones you're part of — scenes you're not in will appear grayed out.</p>
                </div>
              </div>

              {/* ---- Songs ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Songs</h3>
                <div className="help-card">
                  <p>The <strong>Songs</strong> tab is for standalone songs that aren't tied to a specific show — audition pieces, vocal warmups, guitar practice, etc.</p>
                  <div className="help-card-sep" />
                  <p><strong>Categories</strong> — Tag songs as Vocal or Guitar. Use the filter pills at the top to show only one category.</p>
                  <div className="help-card-sep" />
                  <p><strong>Audition songs</strong> — Mark a song as an audition song and it gets pinned to the top of your list for quick access.</p>
                  <div className="help-card-sep" />
                  <p><strong>Progress</strong> — Songs start as "In Progress" (amber dot). Mark them "Completed" (green check) from the song detail page.</p>
                </div>
              </div>

              {/* ---- Recording & Uploading ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Recording & Uploading</h3>
                <div className="help-card">
                  <p><strong>Record audio</strong> — Tap the record button to start capturing with your device's microphone. A waveform visualizer shows the audio level in real time. Tap stop when you're done.</p>
                  <div className="help-card-sep" />
                  <p><strong>Upload files</strong> — Alternatively, tap "Upload" to pick an existing audio file from your device.</p>
                  <div className="help-card-sep" />
                  <p>Both methods work for harmonies, song parts, and scene recordings.</p>
                </div>
              </div>

              {/* ---- Harmonies & Parts ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Harmonies & Parts</h3>
                <div className="help-card">
                  <p><strong>Measure numbers</strong> — Each harmony or part has a start and optional end measure number (e.g., "32" or "32–48"). These are used to sort recordings in order.</p>
                  <div className="help-card-sep" />
                  <p><strong>Captions</strong> — Add a short description like "Soprano line" or "Bridge harmony" so you can quickly identify each recording.</p>
                </div>
              </div>

              {/* ---- Sheet Music ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Sheet Music</h3>
                <div className="help-card">
                  <p>Upload PDF files of your sheet music. Tap any uploaded sheet to view it full-screen. Works for both show musical numbers and standalone songs.</p>
                </div>
              </div>

              {/* ---- Dance Videos & Links ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Dance Videos & Links</h3>
                <div className="help-card">
                  <p><strong>External links</strong> — Paste a YouTube or other video URL and give it a title. Tap the link to open it in your browser.</p>
                  <div className="help-card-sep" />
                  <p><strong>Upload or record</strong> — You can also upload a video file or record one with your camera, directly within the app.</p>
                </div>
              </div>

              {/* ---- Scene Recordings ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Scene Recordings</h3>
                <div className="help-card">
                  <p>For scenes you're in, you can add audio or video recordings with optional captions. Great for capturing blocking notes, line readings, or choreography references.</p>
                </div>
              </div>

              {/* ---- Completing a Show ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Completing a Show</h3>
                <div className="help-card">
                  <p><strong>Mark as completed</strong> — From the Show Hub, tap "Complete Show." You'll see four toggles to choose what to delete:</p>
                  <div className="help-card-sep" />
                  <p>1. Audio recordings (harmonies + scene recordings)</p>
                  <p>2. Video files (uploaded/recorded videos)</p>
                  <p>3. External links</p>
                  <p>4. Sheet music PDFs</p>
                  <div className="help-card-sep" />
                  <p>Notes are always cleared. The show structure (numbers, scenes, which scenes you were in, and your roles) is always preserved.</p>
                  <div className="help-card-sep" />
                  <p>Access completed shows anytime via the <strong>trophy icon</strong> on the home screen. You can also delete any remaining saved data later from the completed show's detail page.</p>
                </div>
              </div>

              {/* ---- Exporting & Importing ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Exporting & Importing</h3>
                <div className="help-card">
                  <p><strong>.grm files</strong> — greenroom uses a custom export format that bundles your show or song data (including all media) into a single portable file.</p>
                  <div className="help-card-sep" />
                  <p><strong>Export</strong> — Export individual shows from the Show Hub, individual songs from the song detail page, or export everything at once from Settings.</p>
                  <div className="help-card-sep" />
                  <p><strong>Import</strong> — Tap "Import Show" or "Import Song" at the bottom of the respective tab and select a .grm file.</p>
                  <div className="help-card-sep" />
                  <p><strong>Duplicate detection</strong> — If a show or song with the same name already exists, you'll be asked to Keep Both, Replace, or Cancel.</p>
                  <div className="help-card-sep" />
                  <p><strong>Sharing</strong> — Use AirDrop, iMessage, or any file-sharing method to send .grm files between devices.</p>
                </div>
              </div>

              {/* ---- Installing the App ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Installing the App</h3>
                <div className="help-card">
                  <p>On iPhone, open greenroom in Safari, tap the <strong>Share</strong> button, then tap <strong>"Add to Home Screen."</strong> The app will launch full-screen like a native app — no browser bar.</p>
                </div>
              </div>

              {/* ---- Data & Privacy ---- */}
              <div className="help-section">
                <h3 className="help-section-title">Data & Privacy</h3>
                <div className="help-card">
                  <p>All your data stays on your device. There are no accounts, no cloud sync, and no tracking. greenroom works entirely offline.</p>
                  <div className="help-card-sep" />
                  <p><strong>Back up regularly</strong> — Use the export feature in Settings to save .grm backups of your shows and songs. If you lose your device, your data is gone unless you've exported it.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ----- Utility helpers for export -----

/** Converts a Blob to a base64 data URL string for JSON serialization */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Converts a base64 data URL back into a Blob */
export function base64ToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** Triggers a file download in the browser */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
