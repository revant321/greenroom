import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  NewSong,
  Song,
  SongCategory,
  SongStatus,
  SongUpdate,
} from "@/lib/types";

export type SongFilter = {
  is_audition_song?: boolean;
  category?: Exclude<SongCategory, null>;
  status?: SongStatus;
};

export const songKeys = {
  all: ["songs"] as const,
  list: (filter: SongFilter) => [...songKeys.all, "list", filter] as const,
  detail: (id: string) => [...songKeys.all, "detail", id] as const,
};

export function useSongs(filter: SongFilter = {}) {
  return useQuery({
    queryKey: songKeys.list(filter),
    queryFn: async (): Promise<Song[]> => {
      let q: any = supabase.from("songs").select("*");
      if (filter.is_audition_song !== undefined)
        q = q.eq("is_audition_song", filter.is_audition_song);
      if (filter.category) q = q.eq("category", filter.category);
      if (filter.status) q = q.eq("status", filter.status);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Song[];
    },
  });
}

export function useSong(id: string | undefined) {
  return useQuery({
    queryKey: id ? songKeys.detail(id) : [...songKeys.all, "detail", "nil"],
    enabled: !!id,
    queryFn: async (): Promise<Song> => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Song;
    },
  });
}

export function useCreateSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSong): Promise<Song> => {
      const { data, error } = await supabase
        .from("songs")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Song;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: songKeys.all }),
  });
}

export function useUpdateSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: SongUpdate;
    }): Promise<Song> => {
      const { data, error } = await supabase
        .from("songs")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Song;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: songKeys.detail(data.id) });
      qc.invalidateQueries({ queryKey: songKeys.all });
    },
  });
}

export function useDeleteSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("songs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: songKeys.all }),
  });
}
