import { ReactNode, useEffect, useRef, useState } from "react";
import { IsRestoringProvider, QueryClientProvider } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
} from "@tanstack/react-query-persist-client";
import { useAuth } from "@/hooks/useAuth";
import { clearLocalData } from "@/lib/localData";
import {
  createPersisterForUser,
  queryClient,
  setActiveQueryCacheUser,
} from "@/lib/queryClient";

// Replaces TanStack's PersistQueryClientProvider so the persisted cache can
// follow the signed-in user: restore that user's cache on sign-in, and wipe
// local data whenever the user changes (including sign-outs that never went
// through the Settings button, like an expired session).
export function UserQueryCacheProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const userId = loading ? undefined : (session?.user.id ?? null);
  const [isRestoring, setIsRestoring] = useState(true);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (userId === undefined) return;
    let cancelled = false;
    let unsubscribe = () => {};

    async function switchTo(nextUserId: string | null) {
      if (previousUserId.current !== null && previousUserId.current !== nextUserId) {
        try {
          await clearLocalData();
        } catch (e) {
          console.warn("Could not clear the previous user's local data", e);
        }
      }
      previousUserId.current = nextUserId;
      if (cancelled) return;
      if (nextUserId === null) {
        setIsRestoring(false);
        return;
      }

      setActiveQueryCacheUser(nextUserId);
      const persister = createPersisterForUser(nextUserId);
      try {
        await persistQueryClientRestore({ queryClient, persister });
      } catch {
        // An unreadable cache is already discarded by persistQueryClientRestore.
      }
      if (cancelled) return;
      setIsRestoring(false);
      unsubscribe = persistQueryClientSubscribe({ queryClient, persister });
    }

    setIsRestoring(true);
    switchTo(userId);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId]);

  return (
    <QueryClientProvider client={queryClient}>
      <IsRestoringProvider value={isRestoring}>{children}</IsRestoringProvider>
    </QueryClientProvider>
  );
}
