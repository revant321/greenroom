import React from "react";
import { Pressable, Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor, act, fireEvent } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => {
  const listeners: Array<(event: string, session: any) => void> = [];
  return {
    supabase: {
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest.fn((cb) => {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: jest.fn() } } };
        }),
        __emit: (event: string, session: any) =>
          listeners.forEach((cb) => cb(event, session)),
      },
    },
  };
});

function Probe() {
  const { session, loading, isGuest, guestBannerDismissed, dismissGuestBanner } =
    useAuth();
  if (loading) return <Text>loading</Text>;
  return (
    <>
      <Text>{session ? `user:${session.user.id}` : "no-session"}</Text>
      <Text>{isGuest ? "guest" : "not-guest"}</Text>
      <Text>{guestBannerDismissed ? "banner-dismissed" : "banner-visible"}</Text>
      <Pressable onPress={dismissGuestBanner}>
        <Text>dismiss</Text>
      </Pressable>
    </>
  );
}

function renderProbe() {
  const client = new QueryClient();
  const clear = jest.spyOn(client, "clear");
  const utils = render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...utils, clear };
}

describe("useAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  test("initially loading, then resolves to no session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    const { getByText } = renderProbe();
    expect(getByText("loading")).toBeTruthy();
    await waitFor(() => expect(getByText("no-session")).toBeTruthy());
  });

  test("hydrates with existing session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const { findByText } = renderProbe();
    expect(await findByText("user:u1")).toBeTruthy();
    expect(await findByText("not-guest")).toBeTruthy();
  });

  test("updates on auth state change", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const { findByText } = renderProbe();
    expect(await findByText("no-session")).toBeTruthy();

    await act(async () => {
      (supabase.auth as any).__emit("SIGNED_IN", { user: { id: "u2" } });
    });
    expect(await findByText("user:u2")).toBeTruthy();
  });

  test("isGuest reflects the anonymous flag on the session user", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "g1", is_anonymous: true } } },
    });
    const { findByText } = renderProbe();
    expect(await findByText("guest")).toBeTruthy();

    // Linking an identity keeps the same user id but drops the flag.
    await act(async () => {
      (supabase.auth as any).__emit("USER_UPDATED", {
        user: { id: "g1", is_anonymous: false },
      });
    });
    expect(await findByText("not-guest")).toBeTruthy();
  });

  test("guest banner dismissal is remembered for the session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "g1", is_anonymous: true } } },
    });
    const { findByText, getByText } = renderProbe();
    expect(await findByText("banner-visible")).toBeTruthy();
    fireEvent.press(getByText("dismiss"));
    expect(await findByText("banner-dismissed")).toBeTruthy();
  });

  test("clears the query cache when the signed-in user changes", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "g1", is_anonymous: true } } },
    });
    const { findByText, clear } = renderProbe();
    expect(await findByText("user:g1")).toBeTruthy();
    expect(clear).not.toHaveBeenCalled();

    // Same user, updated profile: cache stays.
    await act(async () => {
      (supabase.auth as any).__emit("USER_UPDATED", { user: { id: "g1" } });
    });
    expect(clear).not.toHaveBeenCalled();

    // Different user (guest switched to an existing account): cache cleared.
    await act(async () => {
      (supabase.auth as any).__emit("SIGNED_IN", { user: { id: "real" } });
    });
    await waitFor(() => expect(clear).toHaveBeenCalledTimes(1));

    // Sign out: cleared again.
    await act(async () => {
      (supabase.auth as any).__emit("SIGNED_OUT", null);
    });
    await waitFor(() => expect(clear).toHaveBeenCalledTimes(2));
  });
});
