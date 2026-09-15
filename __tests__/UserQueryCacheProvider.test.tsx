import React from "react";
import { Text } from "react-native";
import { useIsRestoring } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
} from "@tanstack/react-query-persist-client";
import { act, render, waitFor } from "@testing-library/react-native";
import { UserQueryCacheProvider } from "@/lib/UserQueryCacheProvider";
import { clearLocalData } from "@/lib/localData";
import { createPersisterForUser, setActiveQueryCacheUser } from "@/lib/queryClient";

const mockAuth: { session: { user: { id: string } } | null; loading: boolean } = {
  session: null,
  loading: true,
};

jest.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth }));
jest.mock("@/lib/localData", () => ({ clearLocalData: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/queryClient", () => {
  const { QueryClient } = jest.requireActual("@tanstack/react-query");
  return {
    queryClient: new QueryClient(),
    createPersisterForUser: jest.fn((userId: string) => ({ userId })),
    setActiveQueryCacheUser: jest.fn(),
  };
});
jest.mock("@tanstack/react-query-persist-client", () => ({
  persistQueryClientRestore: jest.fn().mockResolvedValue(undefined),
  persistQueryClientSubscribe: jest.fn(),
}));

function Probe() {
  return <Text>{useIsRestoring() ? "restoring" : "ready"}</Text>;
}

function renderProvider() {
  return render(
    <UserQueryCacheProvider>
      <Probe />
    </UserQueryCacheProvider>,
  );
}

async function setAuth(
  view: ReturnType<typeof renderProvider>,
  next: { session: { user: { id: string } } | null; loading: boolean },
) {
  mockAuth.session = next.session;
  mockAuth.loading = next.loading;
  await act(async () => {
    view.rerender(
      <UserQueryCacheProvider>
        <Probe />
      </UserQueryCacheProvider>,
    );
  });
}

describe("UserQueryCacheProvider", () => {
  const unsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (persistQueryClientSubscribe as jest.Mock).mockReturnValue(unsubscribe);
    mockAuth.session = null;
    mockAuth.loading = true;
  });

  test("holds queries while the session is still unknown", () => {
    const view = renderProvider();
    expect(view.getByText("restoring")).toBeTruthy();
    expect(persistQueryClientRestore).not.toHaveBeenCalled();
  });

  test("restores the signed-in user's own cache, then starts persisting", async () => {
    const view = renderProvider();
    await setAuth(view, { session: { user: { id: "u1" } }, loading: false });

    await waitFor(() => expect(view.getByText("ready")).toBeTruthy());
    expect(createPersisterForUser).toHaveBeenCalledWith("u1");
    expect(setActiveQueryCacheUser).toHaveBeenCalledWith("u1");
    expect(persistQueryClientRestore).toHaveBeenCalledWith(
      expect.objectContaining({ persister: { userId: "u1" } }),
    );
    expect(persistQueryClientSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ persister: { userId: "u1" } }),
    );
    expect(clearLocalData).not.toHaveBeenCalled();
  });

  test("stops persisting and wipes local data when the user signs out", async () => {
    const view = renderProvider();
    await setAuth(view, { session: { user: { id: "u1" } }, loading: false });
    await waitFor(() => expect(view.getByText("ready")).toBeTruthy());

    await setAuth(view, { session: null, loading: false });

    await waitFor(() => expect(clearLocalData).toHaveBeenCalledTimes(1));
    expect(unsubscribe).toHaveBeenCalled();
    expect(view.getByText("ready")).toBeTruthy();
  });

  test("a new user never sees the previous user's cache", async () => {
    const view = renderProvider();
    await setAuth(view, { session: { user: { id: "u1" } }, loading: false });
    await waitFor(() => expect(view.getByText("ready")).toBeTruthy());
    await setAuth(view, { session: null, loading: false });
    await waitFor(() => expect(clearLocalData).toHaveBeenCalledTimes(1));

    await setAuth(view, { session: { user: { id: "u2" } }, loading: false });

    await waitFor(() =>
      expect(persistQueryClientRestore).toHaveBeenLastCalledWith(
        expect.objectContaining({ persister: { userId: "u2" } }),
      ),
    );
    expect(clearLocalData).toHaveBeenCalledTimes(1);
    expect(setActiveQueryCacheUser).toHaveBeenLastCalledWith("u2");
  });

  test("still lets queries run if wiping the previous user's data fails", async () => {
    (clearLocalData as jest.Mock).mockRejectedValueOnce(new Error("disk error"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const view = renderProvider();
    await setAuth(view, { session: { user: { id: "u1" } }, loading: false });
    await waitFor(() => expect(view.getByText("ready")).toBeTruthy());

    await setAuth(view, { session: null, loading: false });

    await waitFor(() => expect(view.getByText("ready")).toBeTruthy());
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
