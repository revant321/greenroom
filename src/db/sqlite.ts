import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync("greenroom.db");
    db.execSync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    db.execSync(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS media_cache (
        storage_path TEXT PRIMARY KEY,
        local_uri TEXT NOT NULL,
        downloaded_at INTEGER NOT NULL,
        size_bytes INTEGER
      );
    `);
  }
  return db;
}
