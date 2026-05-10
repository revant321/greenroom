import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { NewScene, Scene, SceneUpdate } from "@/lib/types";

export const sceneKeys = {
  all: ["scenes"] as const,
  list: (showId: string) => [...sceneKeys.all, "list", showId] as const,
  detail: (id: string) => [...sceneKeys.all, "detail", id] as const,
};

export function useScenes(showId: string | undefined) {
  return useQuery({
    queryKey: showId ? sceneKeys.list(showId) : [...sceneKeys.all, "list", "nil"],
    enabled: !!showId,
    queryFn: async (): Promise<Scene[]> => {
      const { data, error } = await supabase
        .from("scenes")
        .select("*")
        .eq("show_id", showId!)
        .order("order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Scene[];
    },
  });
}

export function useScene(id: string | undefined) {
  return useQuery({
    queryKey: id ? sceneKeys.detail(id) : [...sceneKeys.all, "detail", "nil"],
    enabled: !!id,
    queryFn: async (): Promise<Scene> => {
      const { data, error } = await supabase
        .from("scenes")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Scene;
    },
  });
}

export function useCreateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewScene): Promise<Scene> => {
      const { data, error } = await supabase
        .from("scenes")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Scene;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: sceneKeys.list(vars.show_id) }),
  });
}

export function useUpdateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: SceneUpdate;
    }): Promise<Scene> => {
      const { data, error } = await supabase
        .from("scenes")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Scene;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: sceneKeys.detail(data.id) });
      qc.invalidateQueries({ queryKey: sceneKeys.list(data.show_id) });
    },
  });
}

export function useDeleteScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("scenes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sceneKeys.all }),
  });
}
