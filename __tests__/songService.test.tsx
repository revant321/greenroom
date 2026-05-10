import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useSongs,
  useSong,
  useCreateSong,
  useUpdateSong,
  useDeleteSong,
} from "@/services/songService";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));

function makeWrapper(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

describe("songService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useSongs with empty filter just orders by created_at", async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const select = jest.fn().mockReturnValue({ order });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSongs({}), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("songs");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  test("useSongs chains eq() per filter field (category + status)", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: "g1", category: "guitar", status: "in-progress" }],
      error: null,
    });
    const eqStatus = jest.fn().mockReturnValue({ order });
    const eqCategory = jest.fn().mockReturnValue({ eq: eqStatus });
    const select = jest.fn().mockReturnValue({ eq: eqCategory });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useSongs({ category: "guitar", status: "in-progress" }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eqCategory).toHaveBeenCalledWith("category", "guitar");
    expect(eqStatus).toHaveBeenCalledWith("status", "in-progress");
  });

  test("useSongs filters by is_audition_song", async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSongs({ is_audition_song: true }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eq).toHaveBeenCalledWith("is_audition_song", true);
  });

  test("useSong queries by id", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "s1" }, error: null });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSong("s1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eq).toHaveBeenCalledWith("id", "s1");
  });

  test("useCreateSong inserts and invalidates", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "s2" }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateSong(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: "Hallelujah" });
    });
    expect(insert).toHaveBeenCalledWith({ title: "Hallelujah" });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useUpdateSong patches by id", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "s1" }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateSong(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "s1", patch: { status: "completed" } });
    });
    expect(update).toHaveBeenCalledWith({ status: "completed" });
    expect(eq).toHaveBeenCalledWith("id", "s1");
  });

  test("useDeleteSong deletes", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteSong(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync("s1");
    });
    expect(eq).toHaveBeenCalledWith("id", "s1");
  });
});
