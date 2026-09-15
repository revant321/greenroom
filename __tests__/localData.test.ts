import { clearLocalData } from "@/lib/localData";
import { kvStore } from "@/db/kvStore";
import { queryClient, setActiveQueryCacheUser } from "@/lib/queryClient";
import { deleteAllCachedMedia } from "@/services/mediaService";

jest.mock("@/db/kvStore", () => ({
  kvStore: { removeByPrefix: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/queryClient", () => ({
  QUERY_CACHE_KEY_PREFIX: "greenroom-query-cache-v1",
  queryClient: { clear: jest.fn() },
  setActiveQueryCacheUser: jest.fn(),
}));
jest.mock("@/services/mediaService", () => ({
  deleteAllCachedMedia: jest.fn().mockResolvedValue(undefined),
}));

describe("clearLocalData", () => {
  beforeEach(() => jest.clearAllMocks());

  test("wipes in-memory queries, the persisted cache, and cached media", async () => {
    await clearLocalData();

    expect(setActiveQueryCacheUser).toHaveBeenCalledWith(null);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(kvStore.removeByPrefix).toHaveBeenCalledWith("greenroom-query-cache-v1");
    expect(deleteAllCachedMedia).toHaveBeenCalledTimes(1);
  });

  test("stops the persister before dropping the persisted cache", async () => {
    const order: string[] = [];
    (setActiveQueryCacheUser as jest.Mock).mockImplementation(() => order.push("deactivate"));
    (queryClient.clear as jest.Mock).mockImplementation(() => order.push("clear"));
    (kvStore.removeByPrefix as jest.Mock).mockImplementation(async () => {
      order.push("removePersisted");
    });
    (deleteAllCachedMedia as jest.Mock).mockImplementation(async () => {
      order.push("deleteMedia");
    });

    await clearLocalData();

    expect(order).toEqual(["deactivate", "clear", "removePersisted", "deleteMedia"]);
  });
});
