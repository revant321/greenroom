import { signInWithApple, signInWithEmail, signInWithGoogle, signOut } from "@/services/authService";
import { supabase } from "@/lib/supabase";
import * as AppleAuth from "expo-apple-authentication";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));
jest.mock("expo-apple-authentication");

describe("authService", () => {
  beforeEach(() => jest.resetAllMocks());

  test("signInWithApple passes the Apple ID token to Supabase", async () => {
    (AppleAuth.signInAsync as jest.Mock).mockResolvedValue({
      identityToken: "fake-apple-token",
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });

    await signInWithApple();

    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "apple",
      token: "fake-apple-token",
    });
  });

  test("signInWithApple throws when Apple returns no identityToken", async () => {
    (AppleAuth.signInAsync as jest.Mock).mockResolvedValue({ identityToken: null });
    await expect(signInWithApple()).rejects.toThrow(/identity token/i);
  });

  test("signInWithGoogle passes the Google ID token to Supabase", async () => {
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "u2" } } },
      error: null,
    });
    await signInWithGoogle("fake-google-token");
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "fake-google-token",
    });
  });

  test("signInWithEmail passes credentials to Supabase", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "u3" } } },
      error: null,
    });
    await signInWithEmail("test@greenroom.local", "hunter2");
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@greenroom.local",
      password: "hunter2",
    });
  });

  test("signInWithEmail throws when Supabase returns an error", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: new Error("Invalid login credentials"),
    });
    await expect(signInWithEmail("a@b.com", "wrong")).rejects.toThrow(/invalid/i);
  });

  test("signOut delegates to supabase.auth.signOut", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
