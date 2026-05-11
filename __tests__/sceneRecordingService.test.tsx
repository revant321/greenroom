import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useSceneRecordings,
  useCreateSceneRecording,
  useDeleteSceneRecording,
} from "@/services/sceneRecordingService";
import { supabase } from "@/lib/supabase";
import { deleteMedia } from "@/services/mediaService";
import { SceneRecording } from "@/lib/types";

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

const sampleRow: SceneRecording = {
  id: "r1",
  user_id: "u",
  scene_id: "sc1",
  kind: "audio",
  storage_path: "u/scene-recordings/x.m4a",
  caption: "",
  created_at: "now",
};

describe("sceneRecordingService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useSceneRecordings queries by scene_id", async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: "r1" }], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSceneRecordings("sc1"), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("scene_recordings");
    expect(eq).toHaveBeenCalledWith("scene_id", "sc1");
  });

  test("useCreateSceneRecording inserts and invalidates", async () => {
    const single = jest
      .fn()
      .mockResolvedValue({ data: { ...sampleRow, id: "r2" }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateSceneRecording(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        scene_id: "sc1",
        kind: "audio",
        storage_path: "u/scene-recordings/y.m4a",
      });
    });
    expect(insert).toHaveBeenCalledWith({
      scene_id: "sc1",
      kind: "audio",
      storage_path: "u/scene-recordings/y.m4a",
    });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useDeleteSceneRecording cascades to deleteMedia", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteSceneRecording(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync(sampleRow);
    });
    expect(deleteMedia).toHaveBeenCalledWith("u/scene-recordings/x.m4a");
    expect(eq).toHaveBeenCalledWith("id", "r1");
  });
});
