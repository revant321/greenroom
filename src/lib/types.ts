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
