import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useHarmonies,
  useCreateHarmony,
  useUpdateHarmony,
  useDeleteHarmony,
} from "@/services/harmonyService";
import { supabase } from "@/lib/supabase";
import { deleteMedia } from "@/services/mediaService";
import { Harmony } from "@/lib/types";

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

const sampleRow: Harmony = {
  id: "h1",
  user_id: "u",
  musical_number_id: "m1",
  storage_path: "u/harmonies/x.m4a",
  measure_number: null,
  caption: "",
  created_at: "now",
};

describe("harmonyService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useHarmonies queries by musical_number_id", async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: "h1" }], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useHarmonies("m1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("harmonies");
    expect(eq).toHaveBeenCalledWith("musical_number_id", "m1");
  });

  test("useCreateHarmony inserts and invalidates the list", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { ...sampleRow, id: "h2" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateHarmony(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        musical_number_id: "m1",
        storage_path: "u/harmonies/y.m4a",
      });
    });
    expect(insert).toHaveBeenCalledWith({
      musical_number_id: "m1",
      storage_path: "u/harmonies/y.m4a",
    });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useUpdateHarmony patches measure and caption", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateHarmony(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: "h1",
        patch: { measure_number: 7, caption: "bridge" },
      });
    });
    expect(update).toHaveBeenCalledWith({ measure_number: 7, caption: "bridge" });
    expect(eq).toHaveBeenCalledWith("id", "h1");
  });

  test("useDeleteHarmony deletes the storage object then the row", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteHarmony(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(sampleRow);
    });
    expect(deleteMedia).toHaveBeenCalledWith("u/harmonies/x.m4a");
    expect(eq).toHaveBeenCalledWith("id", "h1");
  });
});
