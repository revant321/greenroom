import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useDanceVideos,
  useCreateDanceVideo,
  useUpdateDanceVideo,
  useDeleteDanceVideo,
} from "@/services/danceVideoService";
import { supabase } from "@/lib/supabase";
import { deleteMedia } from "@/services/mediaService";
import { DanceVideo } from "@/lib/types";

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

const fileRow: DanceVideo = {
  id: "v1",
  user_id: "u",
  musical_number_id: "m1",
  title: "Choreo",
  storage_path: "u/dance-videos/x.mp4",
  external_url: null,
  created_at: "now",
};

const urlRow: DanceVideo = {
  id: "v2",
  user_id: "u",
  musical_number_id: "m1",
  title: "YouTube ref",
  storage_path: null,
  external_url: "https://youtu.be/abc",
  created_at: "now",
};

describe("danceVideoService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useDanceVideos queries by musical_number_id", async () => {
    const order = jest.fn().mockResolvedValue({ data: [fileRow], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDanceVideos("m1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("dance_videos");
    expect(eq).toHaveBeenCalledWith("musical_number_id", "m1");
  });

  test("useCreateDanceVideo inserts file row and invalidates", async () => {
    const single = jest.fn().mockResolvedValue({ data: fileRow, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateDanceVideo(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        musical_number_id: "m1",
        title: "Choreo",
        storage_path: "u/dance-videos/x.mp4",
      });
    });
    expect(insert).toHaveBeenCalledWith({
      musical_number_id: "m1",
      title: "Choreo",
      storage_path: "u/dance-videos/x.mp4",
    });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useUpdateDanceVideo patches title by id", async () => {
    const single = jest.fn().mockResolvedValue({ data: fileRow, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateDanceVideo(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "v1", patch: { title: "New title" } });
    });
    expect(update).toHaveBeenCalledWith({ title: "New title" });
    expect(eq).toHaveBeenCalledWith("id", "v1");
  });

  test("useDeleteDanceVideo cascades to deleteMedia for file rows", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteDanceVideo(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(fileRow);
    });
    expect(deleteMedia).toHaveBeenCalledWith("u/dance-videos/x.mp4");
    expect(eq).toHaveBeenCalledWith("id", "v1");
  });

  test("useDeleteDanceVideo skips deleteMedia for URL-only rows", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteDanceVideo(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(urlRow);
    });
    expect(deleteMedia).not.toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "v2");
  });
});
