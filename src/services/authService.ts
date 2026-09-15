import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/lib/supabase";
import { clearLocalData } from "@/lib/localData";

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

// Sign out first: Supabase talks to the server before dropping the session, so
// if that fails the user stays signed in and should keep their offline data.
export async function signOutAndReset(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await clearLocalData();
}
