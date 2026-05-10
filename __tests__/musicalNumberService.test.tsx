import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useMusicalNumbers,
  useMusicalNumber,
  useCreateMusicalNumber,
  useUpdateMusicalNumber,
  useDeleteMusicalNumber,
} from "@/services/musicalNumberService";
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

describe("musicalNumberService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useMusicalNumbers queries by show_id", async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: "m1" }], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMusicalNumbers("s1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("musical_numbers");
    expect(eq).toHaveBeenCalledWith("show_id", "s1");
  });

  test("useMusicalNumber queries by id", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "m1" }, error: null });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMusicalNumber("m1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });

  test("useCreateMusicalNumber inserts and invalidates", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "m2", show_id: "s1" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateMusicalNumber(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ show_id: "s1", name: "Act 1", order: 0 });
    });
    expect(insert).toHaveBeenCalledWith({ show_id: "s1", name: "Act 1", order: 0 });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useUpdateMusicalNumber patches by id", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "m1", show_id: "s1" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateMusicalNumber(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "m1", patch: { notes: "bridge in D" } });
    });
    expect(update).toHaveBeenCalledWith({ notes: "bridge in D" });
  });

  test("useDeleteMusicalNumber deletes", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteMusicalNumber(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync("m1");
    });
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });
});
