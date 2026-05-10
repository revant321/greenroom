import { getDb } from "./sqlite";

export const kvStore = {
  async getItem(key: string): Promise<string | null> {
    const row = getDb().getFirstSync<{ value: string }>(
      "SELECT value FROM kv_store WHERE key = ?",
      key,
    );
    return row?.value ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    getDb().runSync(
      "INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      key,
      value,
      Date.now(),
    );
  },
  async removeItem(key: string): Promise<void> {
    getDb().runSync("DELETE FROM kv_store WHERE key = ?", key);
  },
};
