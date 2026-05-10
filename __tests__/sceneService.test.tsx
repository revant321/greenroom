import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useScenes,
  useScene,
  useCreateScene,
  useUpdateScene,
  useDeleteScene,
} from "@/services/sceneService";
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

describe("sceneService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useScenes queries by show_id", async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: "sc1" }], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useScenes("s1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("scenes");
    expect(eq).toHaveBeenCalledWith("show_id", "s1");
  });

  test("useScene queries by id", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "sc1" }, error: null });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useScene("sc1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eq).toHaveBeenCalledWith("id", "sc1");
  });

  test("useCreateScene inserts and invalidates", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "sc2", show_id: "s1" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateScene(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ show_id: "s1", name: "Opening", order: 0 });
    });
    expect(insert).toHaveBeenCalledWith({ show_id: "s1", name: "Opening", order: 0 });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useUpdateScene patches by id", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "sc1", show_id: "s1" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateScene(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "sc1", patch: { notes: "stage left" } });
    });
    expect(update).toHaveBeenCalledWith({ notes: "stage left" });
  });

  test("useUpdateScene toggles is_user_in_scene", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "sc1", show_id: "s1" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateScene(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "sc1", patch: { is_user_in_scene: true } });
    });
    expect(update).toHaveBeenCalledWith({ is_user_in_scene: true });
  });

  test("useDeleteScene deletes", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteScene(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync("sc1");
    });
    expect(eq).toHaveBeenCalledWith("id", "sc1");
  });
});
