import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/lib/supabase";
import { kvStore } from "@/db/kvStore";

/**
 * Set after an explicit sign-out. While present, a cold start with no session
 * goes to the login screen instead of silently creating a fresh guest user.
 */
export const SKIP_AUTO_GUEST_KEY = "auth:skip-auto-guest";

export async function shouldAutoStartGuest(): Promise<boolean> {
  return (await kvStore.getItem(SKIP_AUTO_GUEST_KEY)) === null;
}

export async function signInWithApple(): Promise<void> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error("Apple sign-in did not return an identity token.");
  }
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
  });
  if (error) throw error;
}

export async function signInWithGoogle(idToken: string): Promise<void> {
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (!error) return;

  if (/audience/i.test(error.message)) {
    throw new Error(
      "Supabase rejected the Google token audience. In the Google provider settings, list the Web client ID first and the iOS client ID second, separated by a comma.",
    );
  }

  throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Creates a guest (anonymous) Supabase user. Needs network the first time. */
export async function signInAsGuest(): Promise<void> {
  const { error } = await supabase.auth.signInAnonymously();
  if (!error) return;

  if (error.code === "anonymous_provider_disabled") {
    throw new Error(
      "Guest mode is turned off for this project. Enable anonymous sign-ins in Supabase → Authentication → Sign In / Providers.",
    );
  }
  throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await kvStore.setItem(SKIP_AUTO_GUEST_KEY, "1");
}

/**
 * Result of trying to attach a real identity to the current guest user.
 *
 * - `linked`: the guest user is now a permanent account; same user id, so
 *   every row and file carries over untouched.
 * - `confirm-email`: Supabase sent a confirmation link. The user stays a
 *   guest until they tap it.
 * - `conflict`: that Apple ID / Google account / email already belongs to a
 *   different greenroom account. Nothing was changed. `switchToExisting`
 *   signs in to that other account instead, leaving the guest data behind.
 */
export type LinkOutcome =
  | { status: "linked" }
  | { status: "confirm-email"; email: string }
  | { status: "conflict"; switchToExisting: () => Promise<void> };

const CONFLICT_CODES = new Set(["identity_already_exists", "email_exists"]);

export function isAccountConflict(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code && CONFLICT_CODES.has(e.code)) return true;
  return /already (linked|registered|been registered|exists)|duplicate email/i.test(
    e.message ?? "",
  );
}

export async function linkApple(): Promise<LinkOutcome> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const token = credential.identityToken;
  if (!token) {
    throw new Error("Apple sign-in did not return an identity token.");
  }
  return linkIdToken("apple", token);
}

export async function linkGoogle(idToken: string): Promise<LinkOutcome> {
  return linkIdToken("google", idToken);
}

async function linkIdToken(
  provider: "apple" | "google",
  token: string,
): Promise<LinkOutcome> {
  const { error } = await supabase.auth.linkIdentity({ provider, token });
  if (!error) return { status: "linked" };

  if (isAccountConflict(error)) {
    return {
      status: "conflict",
      switchToExisting: async () => {
        if (provider === "google") return signInWithGoogle(token);
        const { error: signInError } = await supabase.auth.signInWithIdToken({
          provider,
          token,
        });
        if (signInError) throw signInError;
      },
    };
  }
  if (error.code === "manual_linking_disabled") {
    throw new Error(
      "Account linking is turned off for this project. Enable “Allow manual linking” in Supabase → Authentication → Sign In / Providers.",
    );
  }
  throw error;
}

export async function linkEmail(email: string, password: string): Promise<LinkOutcome> {
  const { data, error } = await supabase.auth.updateUser({ email, password });
  if (error) {
    if (isAccountConflict(error)) {
      return {
        status: "conflict",
        switchToExisting: () => signInWithEmail(email, password),
      };
    }
    throw error;
  }

  const user = data.user;
  const stillGuest = !!user?.is_anonymous || !user?.email;
  if (stillGuest) return { status: "confirm-email", email };
  return { status: "linked" };
}
