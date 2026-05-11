import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { NewShow, Show, ShowUpdate } from "@/lib/types";
import { deleteShowWithMedia } from "./cascadeDelete";

export const showKeys = {
  all: ["shows"] as const,
  list: (completed: boolean) => [...showKeys.all, "list", { completed }] as const,
  detail: (id: string) => [...showKeys.all, "detail", id] as const,
};

export function useShows({ completed }: { completed: boolean }) {
  return useQuery({
    queryKey: showKeys.list(completed),
    queryFn: async (): Promise<Show[]> => {
      const { data, error } = await supabase
        .from("shows")
        .select("*")
        .eq("is_completed", completed)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Show[];
    },
  });
}

export function useShow(id: string | undefined) {
  return useQuery({
    queryKey: id ? showKeys.detail(id) : ["shows", "detail", "nil"],
    enabled: !!id,
    queryFn: async (): Promise<Show> => {
      const { data, error } = await supabase.from("shows").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Show;
    },
  });
}

export function useCreateShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewShow): Promise<Show> => {
      const { data, error } = await supabase.from("shows").insert(input).select().single();
      if (error) throw error;
      return data as Show;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: showKeys.all }),
  });
}

export function useUpdateShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: ShowUpdate }): Promise<Show> => {
      const { data, error } = await supabase
        .from("shows")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Show;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: showKeys.all });
      qc.invalidateQueries({ queryKey: showKeys.detail(vars.id) });
    },
  });
}

export function useCompleteShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Show> => {
      const { data, error } = await supabase
        .from("shows")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Show;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: showKeys.all }),
  });
}

export function useDeleteShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await deleteShowWithMedia(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: showKeys.all }),
  });
}
