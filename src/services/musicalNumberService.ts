import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  MusicalNumber,
  MusicalNumberUpdate,
  NewMusicalNumber,
} from "@/lib/types";

export const mnKeys = {
  all: ["musical-numbers"] as const,
  list: (showId: string) => [...mnKeys.all, "list", showId] as const,
  detail: (id: string) => [...mnKeys.all, "detail", id] as const,
};

export function useMusicalNumbers(showId: string | undefined) {
  return useQuery({
    queryKey: showId ? mnKeys.list(showId) : [...mnKeys.all, "list", "nil"],
    enabled: !!showId,
    queryFn: async (): Promise<MusicalNumber[]> => {
      const { data, error } = await supabase
        .from("musical_numbers")
        .select("*")
        .eq("show_id", showId!)
        .order("order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MusicalNumber[];
    },
  });
}

export function useMusicalNumber(id: string | undefined) {
  return useQuery({
    queryKey: id ? mnKeys.detail(id) : [...mnKeys.all, "detail", "nil"],
    enabled: !!id,
    queryFn: async (): Promise<MusicalNumber> => {
      const { data, error } = await supabase
        .from("musical_numbers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as MusicalNumber;
    },
  });
}

export function useCreateMusicalNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewMusicalNumber): Promise<MusicalNumber> => {
      const { data, error } = await supabase
        .from("musical_numbers")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as MusicalNumber;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: mnKeys.list(vars.show_id) }),
  });
}

export function useUpdateMusicalNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: MusicalNumberUpdate;
    }): Promise<MusicalNumber> => {
      const { data, error } = await supabase
        .from("musical_numbers")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as MusicalNumber;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mnKeys.detail(data.id) });
      qc.invalidateQueries({ queryKey: mnKeys.list(data.show_id) });
    },
  });
}

export function useDeleteMusicalNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("musical_numbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mnKeys.all }),
  });
}
