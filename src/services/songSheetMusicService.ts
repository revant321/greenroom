import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  NewSongSheetMusic,
  SongSheetMusic,
  SongSheetMusicUpdate,
} from "@/lib/types";
import { deleteMedia } from "./mediaService";

export const songSheetMusicKeys = {
  all: ["song-sheet-music"] as const,
  list: (songId: string) => [...songSheetMusicKeys.all, "list", songId] as const,
};

export function useSongSheetMusic(songId: string | undefined) {
  return useQuery({
    queryKey: songId
      ? songSheetMusicKeys.list(songId)
      : [...songSheetMusicKeys.all, "list", "nil"],
    enabled: !!songId,
    queryFn: async (): Promise<SongSheetMusic[]> => {
      const { data, error } = await supabase
        .from("song_sheet_music")
        .select("*")
        .eq("song_id", songId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SongSheetMusic[];
    },
  });
}

export function useCreateSongSheetMusic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSongSheetMusic): Promise<SongSheetMusic> => {
      const { data, error } = await supabase
        .from("song_sheet_music")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as SongSheetMusic;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: songSheetMusicKeys.list(data.song_id) }),
  });
}

export function useUpdateSongSheetMusic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: SongSheetMusicUpdate;
    }): Promise<SongSheetMusic> => {
      const { data, error } = await supabase
        .from("song_sheet_music")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as SongSheetMusic;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: songSheetMusicKeys.list(data.song_id) }),
  });
}

export function useDeleteSongSheetMusic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: SongSheetMusic): Promise<void> => {
      await deleteMedia(row.storage_path);
      const { error } = await supabase
        .from("song_sheet_music")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) =>
      qc.invalidateQueries({ queryKey: songSheetMusicKeys.list(row.song_id) }),
  });
}
