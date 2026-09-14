import {
  isAccountConflict,
  linkApple,
  linkEmail,
  linkGoogle,
  shouldAutoStartGuest,
  signInAsGuest,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  SKIP_AUTO_GUEST_KEY,
} from "@/services/authService";
import { supabase } from "@/lib/supabase";
import { kvStore } from "@/db/kvStore";
import * as AppleAuth from "expo-apple-authentication";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
      signInWithPassword: jest.fn(),
      signInAnonymously: jest.fn(),
      linkIdentity: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));
jest.mock("@/db/kvStore", () => ({
  kvStore: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock("expo-apple-authentication");

const authError = (code: string, message = code) =>
  Object.assign(new Error(message), { code });

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

  test("signInWithGoogle explains an OAuth client audience mismatch", async () => {
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: new Error("Unacceptable audience in id_token"),
    });

    await expect(signInWithGoogle("fake-google-token")).rejects.toThrow(
      /Web client ID first/,
    );
  });

  test("signInWithEmail passes credentials to Supabase", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "u3" } } },
      error: null,
    });
    await signInWithEmail("a@b.com", "pw");
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw",
    });
  });

  test("signOut calls Supabase signOut and remembers to skip auto-guest", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(kvStore.setItem).toHaveBeenCalledWith(SKIP_AUTO_GUEST_KEY, "1");
  });

  test("signOut throws on error and does not set the skip flag", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: new Error("boom"),
    });
    await expect(signOut()).rejects.toThrow("boom");
    expect(kvStore.setItem).not.toHaveBeenCalled();
  });
});

describe("guest mode", () => {
  beforeEach(() => jest.resetAllMocks());

  test("shouldAutoStartGuest is true on a fresh install", async () => {
    (kvStore.getItem as jest.Mock).mockResolvedValue(null);
    expect(await shouldAutoStartGuest()).toBe(true);
  });

  test("shouldAutoStartGuest is false after a sign-out", async () => {
    (kvStore.getItem as jest.Mock).mockResolvedValue("1");
    expect(await shouldAutoStartGuest()).toBe(false);
  });

  test("signInAsGuest calls signInAnonymously", async () => {
    (supabase.auth.signInAnonymously as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "g1", is_anonymous: true } } },
      error: null,
    });
    await signInAsGuest();
    expect(supabase.auth.signInAnonymously).toHaveBeenCalled();
  });

  test("signInAsGuest explains when anonymous sign-ins are disabled", async () => {
    (supabase.auth.signInAnonymously as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: authError("anonymous_provider_disabled"),
    });
    await expect(signInAsGuest()).rejects.toThrow(/anonymous sign-ins/i);
  });

  test("isAccountConflict recognises Supabase conflict codes and messages", () => {
    expect(isAccountConflict(authError("identity_already_exists"))).toBe(true);
    expect(isAccountConflict(authError("email_exists"))).toBe(true);
    expect(
      isAccountConflict(new Error("A user with this email address has already been registered")),
    ).toBe(true);
    expect(isAccountConflict(new Error("Network request failed"))).toBe(false);
    expect(isAccountConflict(null)).toBe(false);
  });
});

describe("linking a guest to a real account", () => {
  beforeEach(() => jest.resetAllMocks());

  test("linkApple links the Apple identity to the current user", async () => {
    (AppleAuth.signInAsync as jest.Mock).mockResolvedValue({
      identityToken: "apple-token",
    });
    (supabase.auth.linkIdentity as jest.Mock).mockResolvedValue({
      data: { user: { id: "g1", is_anonymous: false }, session: {} },
      error: null,
    });

    const outcome = await linkApple();

    expect(outcome).toEqual({ status: "linked" });
    expect(supabase.auth.linkIdentity).toHaveBeenCalledWith({
      provider: "apple",
      token: "apple-token",
    });
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  test("linkApple throws when Apple returns no identityToken", async () => {
    (AppleAuth.signInAsync as jest.Mock).mockResolvedValue({ identityToken: null });
    await expect(linkApple()).rejects.toThrow(/identity token/i);
    expect(supabase.auth.linkIdentity).not.toHaveBeenCalled();
  });

  test("linkGoogle reports a conflict and can switch to the existing account", async () => {
    (supabase.auth.linkIdentity as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: authError("identity_already_exists", "Identity is already linked to another user"),
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "real-user" } } },
      error: null,
    });

    const outcome = await linkGoogle("google-token");
    expect(outcome.status).toBe("conflict");
    if (outcome.status !== "conflict") throw new Error("unreachable");

    // Nothing is switched until the user explicitly chooses to.
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();

    await outcome.switchToExisting();
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "google-token",
    });
  });

  test("linkGoogle explains when manual linking is disabled", async () => {
    (supabase.auth.linkIdentity as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: authError("manual_linking_disabled"),
    });
    await expect(linkGoogle("google-token")).rejects.toThrow(/manual linking/i);
  });

  test("linkGoogle rethrows unrelated errors", async () => {
    (supabase.auth.linkIdentity as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("Network request failed"),
    });
    await expect(linkGoogle("google-token")).rejects.toThrow("Network request failed");
  });

  test("linkEmail sets email + password on the guest user in one call", async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "g1", email: "a@b.com", is_anonymous: false } },
      error: null,
    });

    const outcome = await linkEmail("a@b.com", "pw12345678");

    expect(outcome).toEqual({ status: "linked" });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw12345678",
    });
  });

  test("linkEmail reports confirm-email when Supabase requires verification", async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "g1", email: "", new_email: "a@b.com", is_anonymous: true } },
      error: null,
    });

    const outcome = await linkEmail("a@b.com", "pw12345678");
    expect(outcome).toEqual({ status: "confirm-email", email: "a@b.com" });
  });

  test("linkEmail reports a conflict when the email is already registered", async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: authError("email_exists", "A user with this email address has already been registered"),
    });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: {} },
      error: null,
    });

    const outcome = await linkEmail("a@b.com", "pw12345678");
    expect(outcome.status).toBe("conflict");
    if (outcome.status !== "conflict") throw new Error("unreachable");

    await outcome.switchToExisting();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw12345678",
    });
  });

  test("linkEmail rethrows unrelated errors", async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: authError("weak_password", "Password should be at least 6 characters"),
    });
    await expect(linkEmail("a@b.com", "123")).rejects.toThrow(/at least 6/);
  });
});
