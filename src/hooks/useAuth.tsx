import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
  /** True while signed in as an anonymous (guest) Supabase user. */
  isGuest: boolean;
  /** Per-app-launch flag: the guest banner was closed with the X. */
  guestBannerDismissed: boolean;
  dismissGuestBanner: () => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  isGuest: false,
  guestBannerDismissed: false,
  dismissGuestBanner: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);
  const queryClient = useQueryClient();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // The query cache is persisted to disk and keyed by table, not by user. If
  // the signed-in user changes (sign out, or a guest switching to an existing
  // account) the previous person's rows must not linger on screen.
  useEffect(() => {
    if (loading) return;
    const userId = session?.user.id ?? null;
    const previous = lastUserId.current;
    lastUserId.current = userId;
    if (previous !== null && previous !== userId) {
      queryClient.clear();
    }
  }, [session, loading, queryClient]);

  const dismissGuestBanner = useCallback(() => setGuestBannerDismissed(true), []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        isGuest: session?.user.is_anonymous === true,
        guestBannerDismissed,
        dismissGuestBanner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
