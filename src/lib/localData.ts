import { kvStore } from "@/db/kvStore";
import {
  QUERY_CACHE_KEY_PREFIX,
  queryClient,
  setActiveQueryCacheUser,
} from "@/lib/queryClient";
import { deleteAllCachedMedia } from "@/services/mediaService";

// Wipes everything the app has stored on the device for the signed-in user:
// in-memory queries, the persisted query cache, and downloaded media files.
export async function clearLocalData(): Promise<void> {
  setActiveQueryCacheUser(null);
  queryClient.clear();
  await kvStore.removeByPrefix(QUERY_CACHE_KEY_PREFIX);
  await deleteAllCachedMedia();
}
