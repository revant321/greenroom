import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DanceVideo, DanceVideoUpdate, NewDanceVideo } from "@/lib/types";
import { deleteMedia } from "./mediaService";

export const danceVideoKeys = {
  all: ["dance-videos"] as const,
  list: (musicalNumberId: string) =>
    [...danceVideoKeys.all, "list", musicalNumberId] as const,
};

export function useDanceVideos(musicalNumberId: string | undefined) {
  return useQuery({
    queryKey: musicalNumberId
      ? danceVideoKeys.list(musicalNumberId)
      : [...danceVideoKeys.all, "list", "nil"],
    enabled: !!musicalNumberId,
    queryFn: async (): Promise<DanceVideo[]> => {
      const { data, error } = await supabase
        .from("dance_videos")
        .select("*")
        .eq("musical_number_id", musicalNumberId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DanceVideo[];
    },
  });
}

export function useCreateDanceVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewDanceVideo): Promise<DanceVideo> => {
      const { data, error } = await supabase
        .from("dance_videos")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as DanceVideo;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: danceVideoKeys.list(data.musical_number_id) }),
  });
}

export function useUpdateDanceVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: DanceVideoUpdate;
    }): Promise<DanceVideo> => {
      const { data, error } = await supabase
        .from("dance_videos")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as DanceVideo;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: danceVideoKeys.list(data.musical_number_id) }),
  });
}

export function useDeleteDanceVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: DanceVideo): Promise<void> => {
      if (row.storage_path) await deleteMedia(row.storage_path);
      const { error } = await supabase.from("dance_videos").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) =>
      qc.invalidateQueries({ queryKey: danceVideoKeys.list(row.musical_number_id) }),
  });
}
