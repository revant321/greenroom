/**
 * Show export/import utilities for .grm files.
 *
 * Export format (JSON):
 * {
 *   type: 'show',
 *   show: { name, roles, isCompleted, completedAt, createdAt },
 *   musicalNumbers: [
 *     {
 *       number: { name, order, notes, createdAt },
 *       harmonies: [{ audioBlob (base64), measureNumber, caption, createdAt }],
 *       danceVideos: [{ type, url, videoBlob (base64|null), title, createdAt }],
 *       sheetMusic: [{ pdfBlob (base64), title, createdAt }],
 *     }
 *   ],
 *   scenes: [
 *     {
 *       scene: { name, order, isUserInScene, notes, createdAt },
 *       recordings: [{ type, blob (base64|null), url, caption, createdAt }],
 *     }
 *   ]
 * }
 *
 * Blobs are stored as base64 data URLs (e.g. "data:audio/webm;base64,...")
 * so they survive JSON serialization. On import, they're converted back to Blobs.
 */

import { db } from '../db/database';
import { blobToBase64, base64ToBlob, downloadBlob } from '../components/SettingsPanel';

// ==================== EXPORT ====================

/**
 * Reads a show and all its children from IndexedDB, converts media to base64,
 * and returns a plain object ready for JSON.stringify().
 */
export async function exportShowData(showId: number): Promise<Record<string, unknown>> {
  const show = await db.shows.get(showId);
  if (!show) throw new Error('Show not found');

  // Fetch all child data
  const numbers = await db.musicalNumbers.where('showId').equals(showId).sortBy('order');
  const numberIds = numbers.map((n) => n.id!);

  const allHarmonies = numberIds.length > 0
    ? await db.harmonies.where('musicalNumberId').anyOf(numberIds).toArray()
    : [];
  const allDanceVideos = numberIds.length > 0
    ? await db.danceVideos.where('musicalNumberId').anyOf(numberIds).toArray()
    : [];
  const allSheetMusic = numberIds.length > 0
    ? await db.sheetMusic.where('musicalNumberId').anyOf(numberIds).toArray()
    : [];

  const scenes = await db.scenes.where('showId').equals(showId).sortBy('order');
  const sceneIds = scenes.map((s) => s.id!);

  const allRecordings = sceneIds.length > 0
    ? await db.sceneRecordings.where('sceneId').anyOf(sceneIds).toArray()
    : [];

  // Build musical numbers with their media (base64-encoded)
  const musicalNumbers = await Promise.all(numbers.map(async (num) => {
    const harmonies = allHarmonies.filter((h) => h.musicalNumberId === num.id);
    const danceVideos = allDanceVideos.filter((v) => v.musicalNumberId === num.id);
    const sheets = allSheetMusic.filter((s) => s.musicalNumberId === num.id);

    return {
      number: {
        name: num.name,
        order: num.order,
        notes: num.notes,
        createdAt: num.createdAt,
      },
      harmonies: await Promise.all(harmonies.map(async (h) => ({
        audioBlob: await blobToBase64(h.audioBlob),
        measureNumber: h.measureNumber,
        caption: h.caption,
        createdAt: h.createdAt,
      }))),
      danceVideos: await Promise.all(danceVideos.map(async (v) => ({
        type: v.type,
        url: v.url,
        videoBlob: v.videoBlob ? await blobToBase64(v.videoBlob) : null,
        title: v.title,
        createdAt: v.createdAt,
      }))),
      sheetMusic: await Promise.all(sheets.map(async (s) => ({
        pdfBlob: await blobToBase64(s.pdfBlob),
        title: s.title,
        createdAt: s.createdAt,
      }))),
    };
  }));

  // Build scenes with their recordings (base64-encoded)
  const scenesExport = await Promise.all(scenes.map(async (scene) => {
    const recordings = allRecordings.filter((r) => r.sceneId === scene.id);

    return {
      scene: {
        name: scene.name,
        order: scene.order,
        isUserInScene: scene.isUserInScene,
        notes: scene.notes,
        createdAt: scene.createdAt,
      },
      recordings: await Promise.all(recordings.map(async (r) => ({
        type: r.type,
        blob: r.blob ? await blobToBase64(r.blob) : null,
        url: r.url,
        caption: r.caption,
        createdAt: r.createdAt,
      }))),
    };
  }));

  return {
    type: 'show',
    show: {
      name: show.name,
      roles: show.roles,
      isCompleted: show.isCompleted,
      completedAt: show.completedAt,
      createdAt: show.createdAt,
    },
    musicalNumbers,
    scenes: scenesExport,
  };
}

/**
 * Exports a single show as a .grm file download.
 * Calls exportShowData() then triggers a browser download.
 */
export async function exportShowAsGrm(showId: number, showName: string): Promise<void> {
  const data = await exportShowData(showId);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/octet-stream' });
  const safeName = showName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-');
  downloadBlob(blob, `${safeName}-${Date.now()}.grm`);
}

// ==================== IMPORT ====================

/**
 * Imports a show from a parsed .grm entry into IndexedDB.
 *
 * If replaceId is provided, deletes that existing show first (for "Replace" flow).
 * Otherwise creates a new show (for "Keep Both" or first-time import).
 *
 * All operations run in a single Dexie transaction for atomicity —
 * if anything fails, nothing gets written.
 */
export async function importShowEntry(
  entry: Record<string, unknown>,
  replaceId?: number
): Promise<void> {
  await db.transaction(
    'rw',
    [db.shows, db.musicalNumbers, db.harmonies, db.danceVideos, db.sheetMusic, db.scenes, db.sceneRecordings],
    async () => {
      // If replacing, delete the old show and all its children first
      if (replaceId) {
        await deleteShowData(replaceId);
      }

      // Create the show
      const showData = entry.show as Record<string, unknown>;
      const showId = await db.shows.add({
        name: showData.name as string,
        roles: showData.roles as string[],
        isCompleted: showData.isCompleted as number,
        completedAt: showData.completedAt ? new Date(showData.completedAt as string) : null,
        createdAt: new Date(showData.createdAt as string),
      });

      // Import musical numbers + their media
      const numbers = (entry.musicalNumbers || []) as Record<string, unknown>[];
      for (const numEntry of numbers) {
        const num = numEntry.number as Record<string, unknown>;
        const numberId = await db.musicalNumbers.add({
          showId,
          name: num.name as string,
          order: num.order as number,
          notes: num.notes as string,
          createdAt: new Date(num.createdAt as string),
        });

        // Harmonies
        const harmonies = (numEntry.harmonies || []) as Record<string, unknown>[];
        for (const h of harmonies) {
          await db.harmonies.add({
            musicalNumberId: numberId,
            audioBlob: base64ToBlob(h.audioBlob as string),
            measureNumber: h.measureNumber as string,
            caption: h.caption as string,
            createdAt: new Date(h.createdAt as string),
          });
        }

        // Dance videos
        const videos = (numEntry.danceVideos || []) as Record<string, unknown>[];
        for (const v of videos) {
          await db.danceVideos.add({
            musicalNumberId: numberId,
            type: v.type as 'link' | 'file',
            url: v.url as string | null,
            videoBlob: v.videoBlob ? base64ToBlob(v.videoBlob as string) : null,
            title: v.title as string,
            createdAt: new Date(v.createdAt as string),
          });
        }

        // Sheet music
        const sheets = (numEntry.sheetMusic || []) as Record<string, unknown>[];
        for (const s of sheets) {
          await db.sheetMusic.add({
            musicalNumberId: numberId,
            pdfBlob: base64ToBlob(s.pdfBlob as string),
            title: s.title as string,
            createdAt: new Date(s.createdAt as string),
          });
        }
      }

      // Import scenes + their recordings
      const scenes = (entry.scenes || []) as Record<string, unknown>[];
      for (const sceneEntry of scenes) {
        const sc = sceneEntry.scene as Record<string, unknown>;
        const sceneId = await db.scenes.add({
          showId,
          name: sc.name as string,
          order: sc.order as number,
          isUserInScene: sc.isUserInScene as boolean,
          notes: sc.notes as string,
          createdAt: new Date(sc.createdAt as string),
        });

        // Scene recordings
        const recordings = (sceneEntry.recordings || []) as Record<string, unknown>[];
        for (const r of recordings) {
          await db.sceneRecordings.add({
            sceneId,
            type: r.type as 'link' | 'video',
            blob: r.blob ? base64ToBlob(r.blob as string) : null,
            url: (r.url as string | null) || null,
            caption: r.caption as string,
            createdAt: new Date(r.createdAt as string),
          });
        }
      }
    }
  );
}

/**
 * Deletes a show and all its child data from IndexedDB.
 * Used internally by importShowEntry when replacing a duplicate.
 */
async function deleteShowData(showId: number): Promise<void> {
  const numbers = await db.musicalNumbers.where('showId').equals(showId).toArray();
  const numberIds = numbers.map((n) => n.id!);
  if (numberIds.length > 0) {
    await db.harmonies.where('musicalNumberId').anyOf(numberIds).delete();
    await db.danceVideos.where('musicalNumberId').anyOf(numberIds).delete();
    await db.sheetMusic.where('musicalNumberId').anyOf(numberIds).delete();
  }
  await db.musicalNumbers.where('showId').equals(showId).delete();

  const scenes = await db.scenes.where('showId').equals(showId).toArray();
  const sceneIds = scenes.map((s) => s.id!);
  if (sceneIds.length > 0) {
    await db.sceneRecordings.where('sceneId').anyOf(sceneIds).delete();
  }
  await db.scenes.where('showId').equals(showId).delete();

  await db.shows.delete(showId);
}
