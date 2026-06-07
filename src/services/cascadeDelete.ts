import * as FileSystem from "expo-file-system/legacy";
import { mediaCache } from "@/db/mediaCache";
import { supabase } from "@/lib/supabase";

const BUCKET = "media";

async function fetchRows<T>(
  table: string,
  parentColumn: string,
  parentId: string,
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(parentColumn, parentId);
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function collectShowStoragePaths(showId: string): Promise<string[]> {
  const paths: string[] = [];

  const mns = await fetchRows<{ id: string }>(
    "musical_numbers",
    "show_id",
    showId,
  );
  for (const mn of mns) {
    const harms = await fetchRows<{ storage_path: string | null }>(
      "harmonies",
      "musical_number_id",
      mn.id,
    );
    harms.forEach((h) => h.storage_path && paths.push(h.storage_path));
    const dvs = await fetchRows<{ storage_path: string | null }>(
      "dance_videos",
      "musical_number_id",
      mn.id,
    );
    dvs.forEach((d) => d.storage_path && paths.push(d.storage_path));
    const sms = await fetchRows<{ storage_path: string | null }>(
      "sheet_music",
      "musical_number_id",
      mn.id,
    );
    sms.forEach((s) => s.storage_path && paths.push(s.storage_path));
  }

  const scenes = await fetchRows<{ id: string }>("scenes", "show_id", showId);
  for (const sc of scenes) {
    const recs = await fetchRows<{ storage_path: string | null }>(
      "scene_recordings",
      "scene_id",
      sc.id,
    );
    recs.forEach((r) => r.storage_path && paths.push(r.storage_path));
  }

  return paths;
}

export async function collectSongStoragePaths(songId: string): Promise<string[]> {
  const paths: string[] = [];
  const parts = await fetchRows<{ storage_path: string | null }>(
    "song_parts",
    "song_id",
    songId,
  );
  parts.forEach((p) => p.storage_path && paths.push(p.storage_path));
  const tracks = await fetchRows<{ storage_path: string | null }>(
    "song_tracks",
    "song_id",
    songId,
  );
  tracks.forEach((t) => t.storage_path && paths.push(t.storage_path));
  const sheets = await fetchRows<{ storage_path: string | null }>(
    "song_sheet_music",
    "song_id",
    songId,
  );
  sheets.forEach((s) => s.storage_path && paths.push(s.storage_path));
  return paths;
}

async function removeFromStorageAndCache(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const chunks: string[][] = [];
  for (let i = 0; i < paths.length; i += 900) chunks.push(paths.slice(i, i + 900));
  for (const chunk of chunks) {
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) throw error;
  }
  for (const p of paths) {
    const row = mediaCache.get(p);
    if (row) {
      await FileSystem.deleteAsync(row.local_uri, { idempotent: true }).catch(
        () => {},
      );
      mediaCache.remove(p);
    }
  }
}

export async function deleteShowWithMedia(showId: string): Promise<void> {
  const paths = await collectShowStoragePaths(showId);
  await removeFromStorageAndCache(paths);
  const { error } = await supabase.from("shows").delete().eq("id", showId);
  if (error) throw error;
}

export async function deleteSongWithMedia(songId: string): Promise<void> {
  const paths = await collectSongStoragePaths(songId);
  await removeFromStorageAndCache(paths);
  const { error } = await supabase.from("songs").delete().eq("id", songId);
  if (error) throw error;
}

export type MediaKind = "audio" | "video" | "pdf" | "links";

export type CategorizedMedia = {
  audio: {
    storagePaths: string[];
    rowIds: { harmonies: string[]; sceneRecordings: string[] };
  };
  video: {
    storagePaths: string[];
    rowIds: { danceVideos: string[]; sceneRecordings: string[] };
  };
  pdf: {
    storagePaths: string[];
    rowIds: { sheetMusic: string[] };
  };
  links: {
    rowIds: { danceVideos: string[] };
  };
};

export function emptyCategorizedMedia(): CategorizedMedia {
  return {
    audio: { storagePaths: [], rowIds: { harmonies: [], sceneRecordings: [] } },
    video: { storagePaths: [], rowIds: { danceVideos: [], sceneRecordings: [] } },
    pdf: { storagePaths: [], rowIds: { sheetMusic: [] } },
    links: { rowIds: { danceVideos: [] } },
  };
}

export async function collectShowMediaByKind(
  showId: string,
): Promise<CategorizedMedia> {
  const out = emptyCategorizedMedia();

  const mns = await fetchRows<{ id: string }>(
    "musical_numbers",
    "show_id",
    showId,
  );
  for (const mn of mns) {
    const harms = await fetchRows<{ id: string; storage_path: string | null }>(
      "harmonies",
      "musical_number_id",
      mn.id,
    );
    harms.forEach((h) => {
      out.audio.rowIds.harmonies.push(h.id);
      if (h.storage_path) out.audio.storagePaths.push(h.storage_path);
    });

    const dvs = await fetchRows<{
      id: string;
      storage_path: string | null;
      external_url: string | null;
    }>("dance_videos", "musical_number_id", mn.id);
    dvs.forEach((d) => {
      if (d.storage_path) {
        out.video.rowIds.danceVideos.push(d.id);
        out.video.storagePaths.push(d.storage_path);
      } else if (d.external_url) {
        out.links.rowIds.danceVideos.push(d.id);
      }
    });

    const sms = await fetchRows<{ id: string; storage_path: string | null }>(
      "sheet_music",
      "musical_number_id",
      mn.id,
    );
    sms.forEach((s) => {
      out.pdf.rowIds.sheetMusic.push(s.id);
      if (s.storage_path) out.pdf.storagePaths.push(s.storage_path);
    });
  }

  const scenes = await fetchRows<{ id: string }>("scenes", "show_id", showId);
  for (const sc of scenes) {
    const recs = await fetchRows<{
      id: string;
      kind: "audio" | "video";
      storage_path: string | null;
    }>("scene_recordings", "scene_id", sc.id);
    recs.forEach((r) => {
      if (r.kind === "audio") {
        out.audio.rowIds.sceneRecordings.push(r.id);
        if (r.storage_path) out.audio.storagePaths.push(r.storage_path);
      } else {
        out.video.rowIds.sceneRecordings.push(r.id);
        if (r.storage_path) out.video.storagePaths.push(r.storage_path);
      }
    });
  }

  return out;
}

async function deleteRows(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
  for (const chunk of chunks) {
    const { error } = await supabase.from(table).delete().in("id", chunk);
    if (error) throw error;
  }
}

export async function archiveShowWithSelection(
  showId: string,
  keep: Record<MediaKind, boolean>,
): Promise<void> {
  const media = await collectShowMediaByKind(showId);

  const pathsToRemove: string[] = [];
  if (!keep.audio) {
    pathsToRemove.push(...media.audio.storagePaths);
    await deleteRows("harmonies", media.audio.rowIds.harmonies);
    await deleteRows("scene_recordings", media.audio.rowIds.sceneRecordings);
  }
  if (!keep.video) {
    pathsToRemove.push(...media.video.storagePaths);
    await deleteRows("dance_videos", media.video.rowIds.danceVideos);
    await deleteRows("scene_recordings", media.video.rowIds.sceneRecordings);
  }
  if (!keep.pdf) {
    pathsToRemove.push(...media.pdf.storagePaths);
    await deleteRows("sheet_music", media.pdf.rowIds.sheetMusic);
  }
  if (!keep.links) {
    await deleteRows("dance_videos", media.links.rowIds.danceVideos);
  }

  await removeFromStorageAndCache(pathsToRemove);

  const { error } = await supabase
    .from("shows")
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq("id", showId);
  if (error) throw error;
}
