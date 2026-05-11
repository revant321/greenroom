import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useSongParts,
  useCreateSongPart,
  useDeleteSongPart,
} from "@/services/songPartService";
import { supabase } from "@/lib/supabase";
import { deleteMedia } from "@/services/mediaService";
import { SongPart } from "@/lib/types";

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

const sampleRow: SongPart = {
  id: "sp1",
  user_id: "u",
  song_id: "song1",
  storage_path: "u/song-parts/x.m4a",
  measure_number: null,
  caption: "",
  created_at: "now",
};

describe("songPartService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useSongParts queries by song_id", async () => {
    const order = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSongParts("song1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("song_parts");
    expect(eq).toHaveBeenCalledWith("song_id", "song1");
  });

  test("useCreateSongPart inserts and invalidates", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateSongPart(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        song_id: "song1",
        storage_path: "u/song-parts/y.m4a",
      });
    });
    expect(insert).toHaveBeenCalledWith({
      song_id: "song1",
      storage_path: "u/song-parts/y.m4a",
    });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useDeleteSongPart cascades to deleteMedia", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteSongPart(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(sampleRow);
    });
    expect(deleteMedia).toHaveBeenCalledWith("u/song-parts/x.m4a");
    expect(eq).toHaveBeenCalledWith("id", "sp1");
  });
});
