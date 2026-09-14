import {
  createPersisterForUser,
  queryCacheKeyForUser,
  setActiveQueryCacheUser,
} from "@/lib/queryClient";
import { kvStore } from "@/db/kvStore";

jest.mock("@/db/kvStore", () => ({
  kvStore: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const persisted = { buster: "", timestamp: 1, clientState: { queries: [], mutations: [] } };

describe("per-user query cache persister", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setActiveQueryCacheUser(null);
  });

  test("keys the persisted cache by user id", () => {
    expect(queryCacheKeyForUser("u1")).toBe("greenroom-query-cache-v1-u1");
  });

  test("writes under the user's key while that user is active", async () => {
    setActiveQueryCacheUser("u1");
    await createPersisterForUser("u1").persistClient(persisted);
    expect(kvStore.setItem).toHaveBeenCalledWith(
      "greenroom-query-cache-v1-u1",
      JSON.stringify(persisted),
    );
  });

  test("drops writes once the user is no longer active", async () => {
    setActiveQueryCacheUser("u1");
    const persister = createPersisterForUser("u1");
    setActiveQueryCacheUser(null);
    await persister.persistClient(persisted);
    expect(kvStore.setItem).not.toHaveBeenCalled();
  });

  test("never writes another user's persister into the active user's key", async () => {
    setActiveQueryCacheUser("u2");
    await createPersisterForUser("u1").persistClient(persisted);
    expect(kvStore.setItem).not.toHaveBeenCalled();
  });

  test("restores and removes using the user's key", async () => {
    (kvStore.getItem as jest.Mock).mockResolvedValue(JSON.stringify(persisted));
    const persister = createPersisterForUser("u1");
    await expect(persister.restoreClient()).resolves.toEqual(persisted);
    expect(kvStore.getItem).toHaveBeenCalledWith("greenroom-query-cache-v1-u1");
    await persister.removeClient();
    expect(kvStore.removeItem).toHaveBeenCalledWith("greenroom-query-cache-v1-u1");
  });
});
