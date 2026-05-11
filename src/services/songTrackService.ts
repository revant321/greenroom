import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { NewSongTrack, SongTrack, SongTrackUpdate } from "@/lib/types";
import { deleteMedia } from "./mediaService";

export const songTrackKeys = {
  all: ["song-tracks"] as const,
  list: (songId: string) => [...songTrackKeys.all, "list", songId] as const,
};

export function useSongTracks(songId: string | undefined) {
  return useQuery({
    queryKey: songId
      ? songTrackKeys.list(songId)
      : [...songTrackKeys.all, "list", "nil"],
    enabled: !!songId,
    queryFn: async (): Promise<SongTrack[]> => {
      const { data, error } = await supabase
        .from("song_tracks")
        .select("*")
        .eq("song_id", songId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SongTrack[];
    },
  });
}

export function useCreateSongTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSongTrack): Promise<SongTrack> => {
      const { data, error } = await supabase
        .from("song_tracks")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as SongTrack;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: songTrackKeys.list(data.song_id) }),
  });
}

export function useUpdateSongTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: SongTrackUpdate;
    }): Promise<SongTrack> => {
      const { data, error } = await supabase
        .from("song_tracks")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as SongTrack;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: songTrackKeys.list(data.song_id) }),
  });
}

export function useDeleteSongTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: SongTrack): Promise<void> => {
      if (row.storage_path) await deleteMedia(row.storage_path);
      const { error } = await supabase.from("song_tracks").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) =>
      qc.invalidateQueries({ queryKey: songTrackKeys.list(row.song_id) }),
  });
}
