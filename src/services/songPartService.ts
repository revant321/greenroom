import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { NewSongPart, SongPart, SongPartUpdate } from "@/lib/types";
import { deleteMedia } from "./mediaService";

export const songPartKeys = {
  all: ["song-parts"] as const,
  list: (songId: string) => [...songPartKeys.all, "list", songId] as const,
};

export function useSongParts(songId: string | undefined) {
  return useQuery({
    queryKey: songId
      ? songPartKeys.list(songId)
      : [...songPartKeys.all, "list", "nil"],
    enabled: !!songId,
    queryFn: async (): Promise<SongPart[]> => {
      const { data, error } = await supabase
        .from("song_parts")
        .select("*")
        .eq("song_id", songId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SongPart[];
    },
  });
}

export function useCreateSongPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSongPart): Promise<SongPart> => {
      const { data, error } = await supabase
        .from("song_parts")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as SongPart;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: songPartKeys.list(data.song_id) }),
  });
}

export function useUpdateSongPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: SongPartUpdate;
    }): Promise<SongPart> => {
      const { data, error } = await supabase
        .from("song_parts")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as SongPart;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: songPartKeys.list(data.song_id) }),
  });
}

export function useDeleteSongPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: SongPart): Promise<void> => {
      await deleteMedia(row.storage_path);
      const { error } = await supabase.from("song_parts").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) =>
      qc.invalidateQueries({ queryKey: songPartKeys.list(row.song_id) }),
  });
}
