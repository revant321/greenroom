import Dexie, { type Table } from 'dexie';

// ----- Type definitions for each table -----

export interface Show {
  id?: number;            // auto-incremented primary key
  name: string;
  roles: string[];        // e.g. ["Ensemble", "Understudy for Elphaba"]
  isCompleted: number;   // 0 = active, 1 = completed (numeric for IndexedDB queries)
  completedAt: Date | null;
  createdAt: Date;
}

export interface MusicalNumber {
  id?: number;
  showId: number;         // foreign key → shows.id
  name: string;
  order: number;          // position in the show
  notes: string;
  createdAt: Date;
}

export interface Harmony {
  id?: number;
  musicalNumberId: number; // foreign key → musicalNumbers.id
  audioBlob: Blob;
  measureNumber: string;
  caption: string;
  createdAt: Date;
}

export interface DanceVideo {
  id?: number;
  musicalNumberId: number;
  type: 'link' | 'file';
  url: string | null;
  videoBlob: Blob | null;
  title: string;
  createdAt: Date;
}

export interface SheetMusic {
  id?: number;
  musicalNumberId: number; // foreign key → musicalNumbers.id
  pdfBlob: Blob;
  title: string;
  createdAt: Date;
}

export interface Scene {
  id?: number;
  showId: number;
  name: string;
  order: number;
  isUserInScene: boolean;
  notes: string;
  createdAt: Date;
}

export interface SceneRecording {
  id?: number;
  sceneId: number;
  type: 'link' | 'video';       // 'link' = pasted URL, 'video' = uploaded file
  blob: Blob | null;             // null for links
  url: string | null;            // null for uploaded videos
  caption: string;
  createdAt: Date;
}

// ----- Standalone Songs (not tied to shows) -----

export type SongCategory = 'vocal' | 'guitar' | null;
export type SongStatus = 'in-progress' | 'completed';

export interface Song {
  id?: number;
  title: string;
  isAuditionSong: boolean;
  category: SongCategory;       // 'vocal', 'guitar', or null (uncategorized)
  status: SongStatus;           // 'in-progress' or 'completed'
  notes: string;
  createdAt: Date;
}

export interface SongPart {
  id?: number;
  songId: number;          // foreign key → songs.id
  audioBlob: Blob;
  measureNumber: string;   // same format as harmonies: "16" or "16-18"
  caption: string;
  createdAt: Date;
}

export interface SongTrack {
  id?: number;
  songId: number;
  type: 'link' | 'audio' | 'video';
  url: string | null;       // for type="link"
  blob: Blob | null;        // for type="audio" or "video"
  title: string;
  createdAt: Date;
}

export interface SongSheetMusic {
  id?: number;
  songId: number;
  pdfBlob: Blob;
  title: string;
  createdAt: Date;
}

// ----- Quick Changes (between scenes) -----

export type QuickChangeSpeed = 'slow' | 'ok' | 'fast';

export interface QuickChange {
  id?: number;
  showId: number;
  label: string;
  speed: QuickChangeSpeed;
  afterSceneOrder: number;  // appears after the scene with this order number
  createdAt: Date;
}

// ----- Database class -----

class GreenroomDB extends Dexie {
  shows!: Table<Show, number>;
  musicalNumbers!: Table<MusicalNumber, number>;
  harmonies!: Table<Harmony, number>;
  danceVideos!: Table<DanceVideo, number>;
  sheetMusic!: Table<SheetMusic, number>;
  scenes!: Table<Scene, number>;
  sceneRecordings!: Table<SceneRecording, number>;
  quickChanges!: Table<QuickChange, number>;
  songs!: Table<Song, number>;
  songParts!: Table<SongPart, number>;
  songTracks!: Table<SongTrack, number>;
  songSheetMusic!: Table<SongSheetMusic, number>;

  constructor() {
    super('greenroomDB');

    // Version 1 — original tables
    this.version(1).stores({
      shows: '++id, name, isCompleted',
      musicalNumbers: '++id, showId, order',
      harmonies: '++id, musicalNumberId',
      danceVideos: '++id, musicalNumberId',
      scenes: '++id, showId, order',
      sceneRecordings: '++id, sceneId',
    });

    // Version 2 — adds sheet music for musical numbers + standalone songs
    // Dexie merges schemas: existing tables keep their indexes,
    // new tables are added. We only list tables that are new or changed.
    this.version(2).stores({
      sheetMusic: '++id, musicalNumberId',
      songs: '++id, title',
      songParts: '++id, songId',
      songTracks: '++id, songId',
      songSheetMusic: '++id, songId',
    });

    // Version 3 — sceneRecordings now supports 'link' type with url field.
    // No index changes needed (url isn't indexed), but bumping version
    // so Dexie knows the schema evolved for existing databases.
    this.version(3).stores({});

    // Version 4 — songs get category and status fields.
    // We add 'category' as an index so we can filter by it efficiently.
    // The upgrade function backfills existing songs with defaults.
    this.version(4).stores({
      songs: '++id, title, category',
    }).upgrade(tx => {
      return tx.table('songs').toCollection().modify(song => {
        if (song.category === undefined) song.category = null;
        if (song.status === undefined) song.status = 'in-progress';
      });
    });

    // Version 5 — quick changes between scenes (costume/prop changes)
    this.version(5).stores({
      quickChanges: '++id, showId, afterSceneOrder',
    });
  }
}

// Single database instance shared across the app
export const db = new GreenroomDB();
