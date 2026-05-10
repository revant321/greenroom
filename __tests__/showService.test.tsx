import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useShows,
  useShow,
  useCreateShow,
  useUpdateShow,
  useCompleteShow,
  useDeleteShow,
} from "@/services/showService";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

describe("useShows", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns active shows (is_completed = false)", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: "s1", name: "Rent", is_completed: false }],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useShows({ completed: false }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "s1", name: "Rent", is_completed: false }]);
    expect(supabase.from).toHaveBeenCalledWith("shows");
    expect(eq).toHaveBeenCalledWith("is_completed", false);
  });
});

describe("useShow", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns a single show by id", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "s1", name: "Rent" },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useShow("s1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "s1", name: "Rent" });
  });
});

describe("useCreateShow", () => {
  beforeEach(() => jest.clearAllMocks());

  test("inserts a show and invalidates the list query", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "s2", name: "Cats", is_completed: false },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const { client, Wrapper } = makeWrapper();
    const invalidate = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateShow(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "Cats", roles: [] });
    });

    expect(insert).toHaveBeenCalledWith({ name: "Cats", roles: [] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["shows"] });
  });
});

describe("useUpdateShow", () => {
  beforeEach(() => jest.clearAllMocks());

  test("patches a show by id", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "s1" }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateShow(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "s1", patch: { name: "Rent 2" } });
    });

    expect(update).toHaveBeenCalledWith({ name: "Rent 2" });
    expect(eq).toHaveBeenCalledWith("id", "s1");
  });
});

describe("useCompleteShow", () => {
  beforeEach(() => jest.clearAllMocks());

  test("sets is_completed and completed_at", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "s1" }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCompleteShow(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync("s1");
    });

    const patch = update.mock.calls[0][0];
    expect(patch.is_completed).toBe(true);
    expect(typeof patch.completed_at).toBe("string");
  });
});

describe("useDeleteShow", () => {
  beforeEach(() => jest.clearAllMocks());

  test("deletes the row", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteShow(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync("s1");
    });

    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "s1");
  });
});
