import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useSheetMusic,
  useCreateSheetMusic,
  useUpdateSheetMusic,
  useDeleteSheetMusic,
} from "@/services/sheetMusicService";
import { supabase } from "@/lib/supabase";
import { deleteMedia } from "@/services/mediaService";
import { SheetMusic } from "@/lib/types";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/services/mediaService", () => ({
  deleteMedia: jest.fn().mockResolvedValue(undefined),
}));

function makeWrapper(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

const sampleRow: SheetMusic = {
  id: "p1",
  user_id: "u",
  musical_number_id: "m1",
  title: "Score",
  storage_path: "u/sheet-music/x.pdf",
  created_at: "now",
};

describe("sheetMusicService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useSheetMusic queries by musical_number_id", async () => {
    const order = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSheetMusic("m1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("sheet_music");
    expect(eq).toHaveBeenCalledWith("musical_number_id", "m1");
  });

  test("useCreateSheetMusic inserts and invalidates", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateSheetMusic(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        musical_number_id: "m1",
        title: "Score",
        storage_path: "u/sheet-music/x.pdf",
      });
    });
    expect(insert).toHaveBeenCalledWith({
      musical_number_id: "m1",
      title: "Score",
      storage_path: "u/sheet-music/x.pdf",
    });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useUpdateSheetMusic patches title", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateSheetMusic(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "p1", patch: { title: "Bridge score" } });
    });
    expect(update).toHaveBeenCalledWith({ title: "Bridge score" });
  });

  test("useDeleteSheetMusic cascades to deleteMedia", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteSheetMusic(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(sampleRow);
    });
    expect(deleteMedia).toHaveBeenCalledWith("u/sheet-music/x.pdf");
    expect(eq).toHaveBeenCalledWith("id", "p1");
  });
});
