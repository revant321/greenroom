export type Show = {
  id: string;
  user_id: string;
  name: string;
  roles: string[];
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type NewShow = Pick<Show, "name" | "roles">;
export type ShowUpdate = Partial<Pick<Show, "name" | "roles" | "is_completed" | "completed_at">>;

export type MusicalNumber = {
  id: string;
  user_id: string;
  show_id: string;
  name: string;
  order: number;
  notes: string;
  created_at: string;
};

export type NewMusicalNumber = Pick<MusicalNumber, "show_id" | "name" | "order">;
export type MusicalNumberUpdate = Partial<Pick<MusicalNumber, "name" | "order" | "notes">>;

export type Scene = {
  id: string;
  user_id: string;
  show_id: string;
  name: string;
  order: number;
  is_user_in_scene: boolean;
  notes: string;
  created_at: string;
};

export type NewScene = Pick<Scene, "show_id" | "name" | "order"> &
  Partial<Pick<Scene, "is_user_in_scene">>;
export type SceneUpdate = Partial<
  Pick<Scene, "name" | "order" | "is_user_in_scene" | "notes">
>;

export type Harmony = {
  id: string;
  user_id: string;
  musical_number_id: string;
  storage_path: string;
  measure_number: number | null;
  caption: string;
  created_at: string;
};

export type NewHarmony = Pick<Harmony, "musical_number_id" | "storage_path"> &
  Partial<Pick<Harmony, "measure_number" | "caption">>;
export type HarmonyUpdate = Partial<Pick<Harmony, "measure_number" | "caption">>;

export type SceneRecording = {
  id: string;
  user_id: string;
  scene_id: string;
  kind: "audio" | "video";
  storage_path: string;
  caption: string;
  created_at: string;
};

export type NewSceneRecording = Pick<
  SceneRecording,
  "scene_id" | "kind" | "storage_path"
> &
  Partial<Pick<SceneRecording, "caption">>;

export type DanceVideo = {
  id: string;
  user_id: string;
  musical_number_id: string;
  title: string;
  storage_path: string | null;
  external_url: string | null;
  created_at: string;
};

export type NewDanceVideo = {
  musical_number_id: string;
  title: string;
} & (
  | { storage_path: string; external_url?: null }
  | { storage_path?: null; external_url: string }
);

export type DanceVideoUpdate = Partial<Pick<DanceVideo, "title">>;

export type SheetMusic = {
  id: string;
  user_id: string;
  musical_number_id: string;
  title: string;
  storage_path: string;
  created_at: string;
};

export type NewSheetMusic = Pick<
  SheetMusic,
  "musical_number_id" | "title" | "storage_path"
>;

export type SheetMusicUpdate = Partial<Pick<SheetMusic, "title">>;

export type SongCategory = "vocal" | "guitar" | null;
export type SongStatus = "in-progress" | "completed";

export type Song = {
  id: string;
  user_id: string;
  title: string;
  is_audition_song: boolean;
  category: SongCategory;
  status: SongStatus;
  notes: string;
  created_at: string;
};
export type NewSong = Pick<Song, "title"> &
  Partial<Pick<Song, "is_audition_song" | "category" | "status">>;
export type SongUpdate = Partial<
  Pick<Song, "title" | "is_audition_song" | "category" | "status" | "notes">
>;

export type SongPart = {
  id: string;
  user_id: string;
  song_id: string;
  storage_path: string;
  measure_number: number | null;
  caption: string;
  created_at: string;
};
export type NewSongPart = Pick<SongPart, "song_id" | "storage_path"> &
  Partial<Pick<SongPart, "measure_number" | "caption">>;
export type SongPartUpdate = Partial<Pick<SongPart, "measure_number" | "caption">>;

export type SongTrackKind = "audio" | "video" | "link";
export type SongTrack = {
  id: string;
  user_id: string;
  song_id: string;
  kind: SongTrackKind;
  title: string;
  storage_path: string | null;
  external_url: string | null;
  created_at: string;
};
export type NewSongTrack =
  | { song_id: string; kind: "audio" | "video"; storage_path: string; title?: string }
  | { song_id: string; kind: "link"; external_url: string; title?: string };
export type SongTrackUpdate = Partial<Pick<SongTrack, "title">>;

export type SongSheetMusic = {
  id: string;
  user_id: string;
  song_id: string;
  title: string;
  storage_path: string;
  created_at: string;
};
export type NewSongSheetMusic = Pick<
  SongSheetMusic,
  "song_id" | "title" | "storage_path"
>;
export type SongSheetMusicUpdate = Partial<Pick<SongSheetMusic, "title">>;
