import { useQuery } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import { mediaCache } from "@/db/mediaCache";
import { supabase } from "@/lib/supabase";

const BUCKET = "media";

export type MediaSubdir =
  | "harmonies"
  | "scene-recordings"
  | "dance-videos"
  | "sheet-music"
  | "song-parts"
  | "song-tracks"
  | "song-sheet-music";

export async function uploadMedia(
  localUri: string,
  subdir: MediaSubdir,
  extension: string,
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("No signed-in user.");

  const id = Crypto.randomUUID();
  const storagePath = `${uid}/${subdir}/${id}.${extension}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: mimeForExtension(extension),
    upsert: false,
  });
  if (error) throw error;

  const cachedUri = `${FileSystem.documentDirectory}media/${id}.${extension}`;
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}media`, {
    intermediates: true,
  }).catch(() => {});
  await FileSystem.copyAsync({ from: localUri, to: cachedUri });
  const info = await FileSystem.getInfoAsync(cachedUri);
  mediaCache.put(
    storagePath,
    cachedUri,
    info.exists && "size" in info ? (info.size ?? null) : null,
  );

  return storagePath;
}

export async function deleteMedia(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
  const row = mediaCache.get(storagePath);
  if (row) {
    await FileSystem.deleteAsync(row.local_uri, { idempotent: true }).catch(() => {});
    mediaCache.remove(storagePath);
  }
}

export function useMedia(storagePath: string | null | undefined) {
  return useQuery({
    queryKey: ["media", storagePath],
    enabled: !!storagePath,
    staleTime: Infinity,
    queryFn: async (): Promise<string> => {
      const path = storagePath!;
      const cached = mediaCache.get(path);
      if (cached) return cached.local_uri;

      const { data: signed, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600);
      if (error || !signed) throw error ?? new Error("No signed URL");

      const filename = path.split("/").pop() ?? "file";
      const dest = `${FileSystem.documentDirectory}media/${filename}`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}media`, {
        intermediates: true,
      }).catch(() => {});
      const res = await FileSystem.downloadAsync(signed.signedUrl, dest);
      if (res.status !== 200) throw new Error(`Download failed: ${res.status}`);
      const info = await FileSystem.getInfoAsync(dest);
      mediaCache.put(path, dest, info.exists && "size" in info ? (info.size ?? null) : null);
      return dest;
    },
  });
}

function mimeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case "m4a":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
