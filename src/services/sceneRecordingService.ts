import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { NewSceneRecording, SceneRecording } from "@/lib/types";
import { deleteMedia } from "./mediaService";

export const sceneRecordingKeys = {
  all: ["scene-recordings"] as const,
  list: (sceneId: string) =>
    [...sceneRecordingKeys.all, "list", sceneId] as const,
};

export function useSceneRecordings(sceneId: string | undefined) {
  return useQuery({
    queryKey: sceneId
      ? sceneRecordingKeys.list(sceneId)
      : [...sceneRecordingKeys.all, "list", "nil"],
    enabled: !!sceneId,
    queryFn: async (): Promise<SceneRecording[]> => {
      const { data, error } = await supabase
        .from("scene_recordings")
        .select("*")
        .eq("scene_id", sceneId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SceneRecording[];
    },
  });
}

export function useCreateSceneRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSceneRecording): Promise<SceneRecording> => {
      const { data, error } = await supabase
        .from("scene_recordings")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as SceneRecording;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: sceneRecordingKeys.list(data.scene_id) }),
  });
}

export function useDeleteSceneRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: SceneRecording): Promise<void> => {
      await deleteMedia(row.storage_path);
      const { error } = await supabase
        .from("scene_recordings")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) =>
      qc.invalidateQueries({ queryKey: sceneRecordingKeys.list(row.scene_id) }),
  });
}
