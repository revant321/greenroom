import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useSongTracks,
  useCreateSongTrack,
  useDeleteSongTrack,
} from "@/services/songTrackService";
import { supabase } from "@/lib/supabase";
import { deleteMedia } from "@/services/mediaService";
import { SongTrack } from "@/lib/types";

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

const audioRow: SongTrack = {
  id: "t1",
  user_id: "u",
  song_id: "song1",
  kind: "audio",
  title: "Backing track",
  storage_path: "u/song-tracks/x.m4a",
  external_url: null,
  created_at: "now",
};

const linkRow: SongTrack = {
  id: "t2",
  user_id: "u",
  song_id: "song1",
  kind: "link",
  title: "YouTube ref",
  storage_path: null,
  external_url: "https://youtu.be/abc",
  created_at: "now",
};

describe("songTrackService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useSongTracks queries by song_id", async () => {
    const order = jest.fn().mockResolvedValue({ data: [audioRow], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSongTracks("song1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("song_tracks");
    expect(eq).toHaveBeenCalledWith("song_id", "song1");
  });

  test("useCreateSongTrack inserts an audio row", async () => {
    const single = jest.fn().mockResolvedValue({ data: audioRow, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateSongTrack(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        song_id: "song1",
        kind: "audio",
        storage_path: "u/song-tracks/y.m4a",
        title: "B-side",
      });
    });
    expect(insert).toHaveBeenCalledWith({
      song_id: "song1",
      kind: "audio",
      storage_path: "u/song-tracks/y.m4a",
      title: "B-side",
    });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useDeleteSongTrack cascades to deleteMedia for file rows", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteSongTrack(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(audioRow);
    });
    expect(deleteMedia).toHaveBeenCalledWith("u/song-tracks/x.m4a");
    expect(eq).toHaveBeenCalledWith("id", "t1");
  });

  test("useDeleteSongTrack skips deleteMedia for link rows", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteSongTrack(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(linkRow);
    });
    expect(deleteMedia).not.toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "t2");
  });
});
