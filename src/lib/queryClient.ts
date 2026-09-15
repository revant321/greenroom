import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { kvStore } from "@/db/kvStore";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60 * 24 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Every user gets their own persisted cache entry so one account's data can
// never be restored for another, even if clearing on sign-out fails.
export const QUERY_CACHE_KEY_PREFIX = "greenroom-query-cache-v1";

export function queryCacheKeyForUser(userId: string): string {
  return `${QUERY_CACHE_KEY_PREFIX}-${userId}`;
}

let activeUserId: string | null = null;

export function setActiveQueryCacheUser(userId: string | null): void {
  activeUserId = userId;
}

export function createPersisterForUser(userId: string) {
  return createAsyncStoragePersister({
    storage: {
      getItem: (key) => kvStore.getItem(key),
      removeItem: (key) => kvStore.removeItem(key),
      // Writes are throttled, so one can fire after this user has signed out.
      // Dropping it keeps a signed-out user's cache from being recreated.
      setItem: async (key, value) => {
        if (activeUserId !== userId) return;
        await kvStore.setItem(key, value);
      },
    },
    key: queryCacheKeyForUser(userId),
    throttleTime: 1000,
  });
}
