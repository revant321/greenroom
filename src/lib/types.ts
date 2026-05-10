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
