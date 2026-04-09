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
  type: 'audio' | 'video';
  blob: Blob;
  caption: string;
  createdAt: Date;
}

// ----- Database class -----

class GreenroomDB extends Dexie {
  // Dexie infers these as Table<Type, PrimaryKeyType>
  shows!: Table<Show, number>;
  musicalNumbers!: Table<MusicalNumber, number>;
  harmonies!: Table<Harmony, number>;
  danceVideos!: Table<DanceVideo, number>;
  scenes!: Table<Scene, number>;
  sceneRecordings!: Table<SceneRecording, number>;

  constructor() {
    super('greenroomDB'); // this is the IndexedDB database name

    // Version 1 schema — only list indexed/searchable fields.
    // Dexie stores ALL fields, but only the ones listed here get
    // indexed for fast lookups. '++id' means auto-increment.
    this.version(1).stores({
      shows: '++id, name, isCompleted',
      musicalNumbers: '++id, showId, order',
      harmonies: '++id, musicalNumberId',
      danceVideos: '++id, musicalNumberId',
      scenes: '++id, showId, order',
      sceneRecordings: '++id, sceneId',
    });
  }
}

// Single database instance shared across the app
export const db = new GreenroomDB();
