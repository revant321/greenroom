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
