import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import { shouldAutoStartGuest, signInAsGuest } from "@/services/authService";
import { useTheme } from "@/theme/useTheme";

type Bootstrap = "pending" | "guest-started" | "show-login";

/**
 * App entry. A brand-new install skips the sign-in screen entirely: we mint
 * a guest (anonymous) user and go straight to Shows. After an explicit
 * sign-out, or if guest sign-in fails (no network on first launch), we fall
 * back to the login screen, which has its own "Continue without an account".
 */
export default function Index() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  const [bootstrap, setBootstrap] = useState<Bootstrap>("pending");

  useEffect(() => {
    if (loading || session) return;
    let cancelled = false;

    (async () => {
      if (!(await shouldAutoStartGuest())) {
        if (!cancelled) setBootstrap("show-login");
        return;
      }
      try {
        await signInAsGuest();
        if (!cancelled) setBootstrap("guest-started");
      } catch (e: any) {
        if (cancelled) return;
        toast.show(e?.message ?? "Couldn't start guest mode.", "error");
        setBootstrap("show-login");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  if (session) return <Redirect href="/shows" />;
  if (loading || bootstrap === "pending" || bootstrap === "guest-started") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <Redirect href="/login" />;
}
