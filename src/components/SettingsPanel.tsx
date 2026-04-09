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
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [exportingShows, setExportingShows] = useState(false);
  const [exportShowsMsg, setExportShowsMsg] = useState('');

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
      const blob = new Blob([json], { type: 'application/json' });
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
      const blob = new Blob([json], { type: 'application/json' });
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
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div className={`settings-panel ${isOpen ? 'settings-panel-open' : ''}`}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} title="Close">✕</button>
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
