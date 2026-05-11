import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Harmony, HarmonyUpdate, NewHarmony } from "@/lib/types";
import { deleteMedia } from "./mediaService";

export const harmonyKeys = {
  all: ["harmonies"] as const,
  list: (musicalNumberId: string) =>
    [...harmonyKeys.all, "list", musicalNumberId] as const,
};

export function useHarmonies(musicalNumberId: string | undefined) {
  return useQuery({
    queryKey: musicalNumberId
      ? harmonyKeys.list(musicalNumberId)
      : [...harmonyKeys.all, "list", "nil"],
    enabled: !!musicalNumberId,
    queryFn: async (): Promise<Harmony[]> => {
      const { data, error } = await supabase
        .from("harmonies")
        .select("*")
        .eq("musical_number_id", musicalNumberId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Harmony[];
    },
  });
}

export function useCreateHarmony() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewHarmony): Promise<Harmony> => {
      const { data, error } = await supabase
        .from("harmonies")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Harmony;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: harmonyKeys.list(data.musical_number_id) }),
  });
}

export function useUpdateHarmony() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: HarmonyUpdate;
    }): Promise<Harmony> => {
      const { data, error } = await supabase
        .from("harmonies")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Harmony;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: harmonyKeys.list(data.musical_number_id) }),
  });
}

export function useDeleteHarmony() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Harmony): Promise<void> => {
      await deleteMedia(row.storage_path);
      const { error } = await supabase.from("harmonies").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) =>
      qc.invalidateQueries({ queryKey: harmonyKeys.list(row.musical_number_id) }),
  });
}
