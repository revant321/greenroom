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
