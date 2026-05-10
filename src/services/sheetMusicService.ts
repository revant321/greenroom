import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { NewSheetMusic, SheetMusic, SheetMusicUpdate } from "@/lib/types";
import { deleteMedia } from "./mediaService";

export const sheetMusicKeys = {
  all: ["sheet-music"] as const,
  list: (musicalNumberId: string) =>
    [...sheetMusicKeys.all, "list", musicalNumberId] as const,
};

export function useSheetMusic(musicalNumberId: string | undefined) {
  return useQuery({
    queryKey: musicalNumberId
      ? sheetMusicKeys.list(musicalNumberId)
      : [...sheetMusicKeys.all, "list", "nil"],
    enabled: !!musicalNumberId,
    queryFn: async (): Promise<SheetMusic[]> => {
      const { data, error } = await supabase
        .from("sheet_music")
        .select("*")
        .eq("musical_number_id", musicalNumberId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SheetMusic[];
    },
  });
}

export function useCreateSheetMusic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSheetMusic): Promise<SheetMusic> => {
      const { data, error } = await supabase
        .from("sheet_music")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as SheetMusic;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: sheetMusicKeys.list(data.musical_number_id) }),
  });
}

export function useUpdateSheetMusic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: SheetMusicUpdate;
    }): Promise<SheetMusic> => {
      const { data, error } = await supabase
        .from("sheet_music")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as SheetMusic;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: sheetMusicKeys.list(data.musical_number_id) }),
  });
}

export function useDeleteSheetMusic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: SheetMusic): Promise<void> => {
      await deleteMedia(row.storage_path);
      const { error } = await supabase.from("sheet_music").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) =>
      qc.invalidateQueries({ queryKey: sheetMusicKeys.list(row.musical_number_id) }),
  });
}
