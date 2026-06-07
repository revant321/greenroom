import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { NewShow, Show, ShowUpdate } from "@/lib/types";
import {
  archiveShowWithSelection,
  deleteShowWithMedia,
  MediaKind,
} from "./cascadeDelete";

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

export type ShowMediaCounts = Record<MediaKind, number>;

export function useShowMediaCounts(showId: string | undefined) {
  return useQuery({
    queryKey: ["shows", "mediaCounts", showId ?? "nil"] as const,
    enabled: !!showId,
    queryFn: async (): Promise<ShowMediaCounts> => {
      const { data: mns, error: e1 } = await supabase
        .from("musical_numbers")
        .select("id")
        .eq("show_id", showId!);
      if (e1) throw e1;
      const mnIds = (mns ?? []).map((m: { id: string }) => m.id);

      const { data: scs, error: e2 } = await supabase
        .from("scenes")
        .select("id")
        .eq("show_id", showId!);
      if (e2) throw e2;
      const scIds = (scs ?? []).map((s: { id: string }) => s.id);

      const counts: ShowMediaCounts = { audio: 0, video: 0, pdf: 0, links: 0 };

      if (mnIds.length > 0) {
        const { count: harmCount, error: he } = await supabase
          .from("harmonies")
          .select("id", { count: "exact", head: true })
          .in("musical_number_id", mnIds);
        if (he) throw he;
        counts.audio += harmCount ?? 0;

        const { count: dvFileCount, error: dfe } = await supabase
          .from("dance_videos")
          .select("id", { count: "exact", head: true })
          .in("musical_number_id", mnIds)
          .not("storage_path", "is", null);
        if (dfe) throw dfe;
        counts.video += dvFileCount ?? 0;

        const { count: dvLinkCount, error: dle } = await supabase
          .from("dance_videos")
          .select("id", { count: "exact", head: true })
          .in("musical_number_id", mnIds)
          .is("storage_path", null);
        if (dle) throw dle;
        counts.links += dvLinkCount ?? 0;

        const { count: pdfCount, error: pe } = await supabase
          .from("sheet_music")
          .select("id", { count: "exact", head: true })
          .in("musical_number_id", mnIds);
        if (pe) throw pe;
        counts.pdf += pdfCount ?? 0;
      }

      if (scIds.length > 0) {
        const { count: audCount, error: ae } = await supabase
          .from("scene_recordings")
          .select("id", { count: "exact", head: true })
          .in("scene_id", scIds)
          .eq("kind", "audio");
        if (ae) throw ae;
        counts.audio += audCount ?? 0;

        const { count: vidCount, error: ve } = await supabase
          .from("scene_recordings")
          .select("id", { count: "exact", head: true })
          .in("scene_id", scIds)
          .eq("kind", "video");
        if (ve) throw ve;
        counts.video += vidCount ?? 0;
      }

      return counts;
    },
  });
}

export function useArchiveShowWithSelection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      keep: Record<MediaKind, boolean>;
    }): Promise<void> => {
      await archiveShowWithSelection(input.id, input.keep);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: showKeys.all });
      qc.invalidateQueries({ queryKey: showKeys.detail(vars.id) });
    },
  });
}
