import { getDb } from "./sqlite";

type Row = {
  local_uri: string;
  downloaded_at: number;
  size_bytes: number | null;
};

export const mediaCache = {
  get(storagePath: string): Row | null {
    return (
      getDb().getFirstSync<Row>(
        "SELECT local_uri, downloaded_at, size_bytes FROM media_cache WHERE storage_path = ?",
        storagePath,
      ) ?? null
    );
  },
  put(storagePath: string, localUri: string, sizeBytes: number | null): void {
    getDb().runSync(
      "INSERT INTO media_cache (storage_path, local_uri, downloaded_at, size_bytes) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(storage_path) DO UPDATE SET local_uri=excluded.local_uri, downloaded_at=excluded.downloaded_at, size_bytes=excluded.size_bytes",
      storagePath,
      localUri,
      Date.now(),
      sizeBytes,
    );
  },
  remove(storagePath: string): void {
    getDb().runSync("DELETE FROM media_cache WHERE storage_path = ?", storagePath);
  },
};
